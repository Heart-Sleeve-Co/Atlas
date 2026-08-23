import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- Module: root / health ----
class TestRoot:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["grid"]["x"] == [-6, 6]
        assert d["grid"]["y"] == [-6, 6]


# ---- Module: GET /api/emotions ----
class TestEmotionsList:
    def test_list(self, api):
        r = api.get(f"{BASE_URL}/api/emotions", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["grid"] == {"x_min": -6, "x_max": 6, "y_min": -6, "y_max": 6}
        em = d["emotions"]
        assert isinstance(em, list) and len(em) > 0
        # all within bounds, no mongo _id leaked
        for e in em:
            assert -6 <= e["x"] <= 6 and -6 <= e["y"] <= 6
            assert "_id" not in e
            assert e["name"] and e["description"]
            assert e["source"] in ("curated", "generated")
        # unique coordinates among curated
        curated = [e for e in em if e["source"] == "curated"]
        keys = [(e["x"], e["y"]) for e in curated]
        assert len(keys) == len(set(keys))
        print(f"curated={len(curated)} total={len(em)}")

    def test_curated_coverage(self, api):
        r = api.get(f"{BASE_URL}/api/emotions", timeout=30)
        curated = [e for e in r.json()["emotions"] if e["source"] == "curated"]
        # informational: how many of the 169 cells are curated
        assert len(curated) <= 169
        print(f"curated cells in range: {len(curated)}/169")

    def test_total_emotions_within_169(self, api):
        r = api.get(f"{BASE_URL}/api/emotions", timeout=30)
        em = r.json()["emotions"]
        keys = {(e["x"], e["y"]) for e in em}
        assert len(keys) <= 169, f"more than 169 unique cells: {len(keys)}"
        # no duplicate coordinate across curated+generated
        assert len(keys) == len(em), "duplicate coordinates returned (curated + generated overlap)"

    # iteration_7: full 13x13 coverage expected (curated placeholders fill gaps)
    def test_exactly_169_full_grid(self, api):
        r = api.get(f"{BASE_URL}/api/emotions", timeout=30)
        em = r.json()["emotions"]
        assert len(em) == 169, f"expected 169 emotions, got {len(em)}"
        keys = {(e["x"], e["y"]) for e in em}
        expected = {(x, y) for x in range(-6, 7) for y in range(-6, 7)}
        assert keys == expected, f"missing cells: {sorted(expected - keys)[:10]}"

    def test_known_placeholder_and_curated_entries(self, api):
        r = api.get(f"{BASE_URL}/api/emotions", timeout=30)
        m = {(e["x"], e["y"]): e for e in r.json()["emotions"]}
        assert m[(-5, 6)]["name"].startswith("TODO"), m[(-5, 6)]["name"]
        assert m[(3, 3)]["name"] == "Cheerful"
        assert isinstance(m[(3, 3)]["description"], str) and len(m[(3, 3)]["description"]) > 10

    def test_generate_origin_curated(self, api):
        r = api.post(f"{BASE_URL}/api/emotions/generate", json={"x": 0, "y": 0}, timeout=90)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["x"] == 0 and d["y"] == 0
        assert d["source"] == "curated"
        assert isinstance(d["name"], str) and d["name"]


# ---- Module: POST /api/emotions/generate ----
class TestGenerate:
    def test_curated_coord_outraged(self, api):
        r = api.post(f"{BASE_URL}/api/emotions/generate", json={"x": -6, "y": 6}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["x"] == -6 and d["y"] == 6
        assert d["source"] == "curated"
        assert d["name"] == "Outraged", d
        assert isinstance(d["description"], str) and len(d["description"]) > 0

    def test_llm_generate_and_cache(self, api):
        payload = {"x": 5, "y": -1}
        r = api.post(f"{BASE_URL}/api/emotions/generate", json=payload, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["x"] == 5 and d["y"] == -1
        assert isinstance(d["name"], str) and 0 < len(d["name"]) < 60
        assert isinstance(d["description"], str) and len(d["description"]) > 10
        assert d["source"] in ("curated", "generated")
        # second call should return same value (cached or curated)
        r2 = api.post(f"{BASE_URL}/api/emotions/generate", json=payload, timeout=120)
        assert r2.status_code == 200
        assert r2.json()["name"] == d["name"]

    def test_generate_4_minus2(self, api):
        # FEATURE 6 spec: POST {x:4,y:-2} must return valid name + description
        r = api.post(f"{BASE_URL}/api/emotions/generate", json={"x": 4, "y": -2}, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["x"] == 4 and d["y"] == -2
        assert isinstance(d["name"], str) and len(d["name"].strip()) > 0
        assert isinstance(d["description"], str) and len(d["description"].strip()) > 10
        print(f"(4,-2) -> {d['name']} [{d['source']}]")

    def test_out_of_bounds(self, api):
        r = api.post(f"{BASE_URL}/api/emotions/generate", json={"x": 9, "y": 0}, timeout=30)
        assert r.status_code == 400, r.text
        assert "detail" in r.json()

    def test_invalid_payload(self, api):
        r = api.post(f"{BASE_URL}/api/emotions/generate", json={"x": "abc"}, timeout=30)
        assert r.status_code == 422, r.text
