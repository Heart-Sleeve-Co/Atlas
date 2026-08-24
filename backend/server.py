from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import uuid
import hmac
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
EMOTIONS_JSON_PATH = ROOT_DIR / "emotions_data.json"
load_dotenv(ROOT_DIR / '.env')


def load_emotions():
    """Read emotions from the JSON file every call so admin edits are picked up immediately."""
    with open(EMOTIONS_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_emotions(data):
    """Persist emotions to the JSON file atomically."""
    tmp = EMOTIONS_JSON_PATH.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp, EMOTIONS_JSON_PATH)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
ADMIN_PASSPHRASE = os.environ.get('ADMIN_PASSPHRASE')

# Grid bounds - 14x14 = 196 emotions (49 per quadrant); no coords with x=0 or y=0
X_MIN, X_MAX = -7, 7
Y_MIN, Y_MAX = -7, 7


def is_valid_coord(x: int, y: int) -> bool:
    return X_MIN <= x <= X_MAX and Y_MIN <= y <= Y_MAX and x != 0 and y != 0

app = FastAPI(title="Emotions Chart API")
api_router = APIRouter(prefix="/api")


class Emotion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    x: int
    y: int
    name: str
    description: str
    source: str = "curated"  # curated | generated


class GenerateRequest(BaseModel):
    x: int
    y: int


def coord_key(x: int, y: int) -> str:
    return f"{x},{y}"


def describe_axes(x: int, y: int) -> str:
    """Describe the quadrant qualities of a coordinate in natural language."""
    def band(v: int, low_label: str, high_label: str) -> str:
        if v >= 6:
            return f"very {high_label}"
        if v >= 3:
            return f"clearly {high_label}"
        if v >= 1:
            return f"slightly {high_label}"
        if v >= -2:
            return f"slightly {low_label}"
        if v >= -5:
            return f"clearly {low_label}"
        return f"very {low_label}"

    pleasant = band(x, "unpleasant", "pleasant")
    energy = band(y, "low-energy", "high-energy")
    return f"{pleasant}, {energy}"


@api_router.get("/")
async def root():
    return {"message": "Emotions Chart API", "grid": {"x": [X_MIN, X_MAX], "y": [Y_MIN, Y_MAX]}}


@api_router.get("/emotions")
async def get_all_emotions():
    """Return all curated emotions + any cached generated emotions."""
    emotions = []
    covered = set()
    curated = load_emotions()
    # curated (only keep entries within current grid bounds)
    for key, data in curated.items():
        x_str, y_str = key.split(",")
        x, y = int(x_str), int(y_str)
        if not is_valid_coord(x, y):
            continue
        covered.add((x, y))
        emotions.append({
            "x": x,
            "y": y,
            "name": data["name"],
            "description": data["description"],
            "source": "curated",
        })
    # cached generated — only include coords that pass validity AND aren't already covered
    cached = await db.generated_emotions.find({}, {"_id": 0}).to_list(2000)
    for c in cached:
        if not is_valid_coord(c["x"], c["y"]):
            continue
        if (c["x"], c["y"]) in covered:
            continue
        emotions.append({
            "x": c["x"],
            "y": c["y"],
            "name": c["name"],
            "description": c["description"],
            "source": "generated",
        })
    return {"emotions": emotions, "grid": {"x_min": X_MIN, "x_max": X_MAX, "y_min": Y_MIN, "y_max": Y_MAX}}


@api_router.post("/emotions/generate")
async def generate_emotion(req: GenerateRequest):
    x, y = req.x, req.y
    if not is_valid_coord(x, y):
        raise HTTPException(status_code=400, detail="Coordinate out of grid bounds")

    key = coord_key(x, y)
    # Return curated if exists AND is in current bounds
    curated = load_emotions()
    if key in curated:
        d = curated[key]
        return {"x": x, "y": y, "name": d["name"], "description": d["description"], "source": "curated"}

    # Return cached if exists
    cached = await db.generated_emotions.find_one({"x": x, "y": y}, {"_id": 0})
    if cached:
        return {
            "x": x, "y": y,
            "name": cached["name"],
            "description": cached["description"],
            "source": "generated",
        }

    # Generate via LLM
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    qualities = describe_axes(x, y)
    system_msg = (
        "You are a subtle, poetic emotion cartographer. Given a point on a 2D affect grid "
        "(x = pleasantness from -7 unpleasant to +7 pleasant; y = energy from -7 low to +7 high; "
        "coordinates never include 0), "
        "you name a single specific emotion and describe it in ONE evocative sentence (15-30 words). "
        "Respond ONLY with a JSON object: {\"name\": \"...\", \"description\": \"...\"}. "
        "No preamble, no code fences, no extra keys. The name should be 1-2 words, common English."
    )
    session_id = f"emotion-{uuid.uuid4()}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-6")

    user_prompt = (
        f"Point ({x}, {y}). Qualities: {qualities}. "
        f"Name the emotion at this coordinate and describe it in one sentence."
    )

    try:
        response_text = await chat.send_message(UserMessage(text=user_prompt))
    except Exception as e:
        logging.exception("LLM error generating emotion")
        raise HTTPException(status_code=502, detail=f"LLM error: {str(e)}")

    # Parse JSON from response
    text = response_text.strip()
    # Strip common code fences if present
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()
    try:
        parsed = json.loads(text)
        name = str(parsed["name"]).strip()
        description = str(parsed["description"]).strip()
    except Exception:
        # Fallback: try to find a JSON object
        try:
            start = text.index("{")
            end = text.rindex("}") + 1
            parsed = json.loads(text[start:end])
            name = str(parsed["name"]).strip()
            description = str(parsed["description"]).strip()
        except Exception:
            raise HTTPException(status_code=502, detail="Failed to parse LLM response")

    doc = {
        "x": x,
        "y": y,
        "name": name,
        "description": description,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.generated_emotions.update_one(
        {"x": x, "y": y}, {"$set": doc}, upsert=True
    )
    return {"x": x, "y": y, "name": name, "description": description, "source": "generated"}


# ============ ADMIN ENDPOINTS ============
# CRUD for manually editing emotion titles / descriptions.
# Protected by a passphrase set in backend/.env (ADMIN_PASSPHRASE).

def require_admin(x_admin_passphrase: Optional[str] = Header(default=None)):
    """FastAPI dependency: constant-time compare X-Admin-Passphrase header."""
    if not ADMIN_PASSPHRASE:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_PASSPHRASE is not configured on the server.",
        )
    if not x_admin_passphrase or not hmac.compare_digest(
        x_admin_passphrase, ADMIN_PASSPHRASE
    ):
        raise HTTPException(status_code=401, detail="Invalid passphrase")
    return True


class AdminVerifyRequest(BaseModel):
    passphrase: str


@api_router.post("/admin/verify")
async def admin_verify(req: AdminVerifyRequest):
    """Check a passphrase without touching data. Used by the login screen."""
    if not ADMIN_PASSPHRASE:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_PASSPHRASE is not configured on the server.",
        )
    if not hmac.compare_digest(req.passphrase, ADMIN_PASSPHRASE):
        raise HTTPException(status_code=401, detail="Invalid passphrase")
    return {"ok": True}


class AdminUpdateRequest(BaseModel):
    name: str
    description: str


class AdminBulkUpdateRequest(BaseModel):
    updates: dict  # {"x,y": {"name": str, "description": str}}


@api_router.get("/admin/emotions")
async def admin_get_all(_: bool = Depends(require_admin)):
    """Return every valid (non-axis) coordinate in the grid with its current name + description."""
    data = load_emotions()
    entries = []
    for y in range(Y_MAX, Y_MIN - 1, -1):
        if y == 0:
            continue
        for x in range(X_MIN, X_MAX + 1):
            if x == 0:
                continue
            key = coord_key(x, y)
            d = data.get(key, {"name": "", "description": ""})
            entries.append({
                "x": x,
                "y": y,
                "name": d.get("name", ""),
                "description": d.get("description", ""),
            })
    return {
        "entries": entries,
        "grid": {"x_min": X_MIN, "x_max": X_MAX, "y_min": Y_MIN, "y_max": Y_MAX},
    }


@api_router.put("/admin/emotions/{x}/{y}")
async def admin_update_one(x: int, y: int, req: AdminUpdateRequest, _: bool = Depends(require_admin)):
    """Update a single coordinate's name + description."""
    if not is_valid_coord(x, y):
        raise HTTPException(status_code=400, detail="Coordinate out of grid bounds")
    data = load_emotions()
    key = coord_key(x, y)
    data[key] = {"name": req.name.strip(), "description": req.description.strip()}
    save_emotions(data)
    return {"x": x, "y": y, **data[key]}


@api_router.put("/admin/emotions")
async def admin_bulk_update(req: AdminBulkUpdateRequest, _: bool = Depends(require_admin)):
    """Bulk-update multiple coordinates in one write."""
    data = load_emotions()
    written = 0
    for key, val in req.updates.items():
        try:
            x_str, y_str = key.split(",")
            x, y = int(x_str), int(y_str)
        except (ValueError, AttributeError):
            continue
        if not is_valid_coord(x, y):
            continue
        name = str(val.get("name", "")).strip()
        description = str(val.get("description", "")).strip()
        data[key] = {"name": name, "description": description}
        written += 1
    save_emotions(data)
    return {"written": written}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
