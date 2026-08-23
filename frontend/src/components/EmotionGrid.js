import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
  forceSimulation,
  forceX,
  forceY,
  forceCollide,
} from "d3-force";
import { emotionColor } from "@/components/emotionColors";
import EmotionDetailPanel from "@/components/EmotionDetailPanel";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Grid config (matches backend) - 13x13 = 169 emotions
const X_MIN = -6,
  X_MAX = 6;
const Y_MIN = -6,
  Y_MAX = 6;
const GRID_COLS = X_MAX - X_MIN + 1; // 13
const GRID_ROWS = Y_MAX - Y_MIN + 1; // 13

// Layout constants — reserve space around the grid for axis labels
const PADDING_TOP = 140; // room for header + top axis label
const PADDING_BOTTOM = 200; // room for bottom axis label + legend
const PADDING_LEFT = 220; // room for left axis label
const PADDING_RIGHT = 220; // room for right axis label

// Bubble sizing
const BASE_RADIUS = 18;
const HOVER_SCALE = 1.5;
// Minimum spacing between adjacent bubble centers — generous padding so
// hovering only nudges immediate neighbors, not the whole grid.
const MIN_STEP = 78;

function coordKey(x, y) {
  return `${x},${y}`;
}

export default function EmotionGrid() {
  const containerRef = useRef(null);
  const nodesRef = useRef([]);
  const domRefs = useRef(new Map());
  const simulationRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [emotionMap, setEmotionMap] = useState(new Map());
  const [hoveredKey, setHoveredKey] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loadingSelected, setLoadingSelected] = useState(false);

  // Precompute 169 nodes
  const initialNodes = useMemo(() => {
    const arr = [];
    for (let x = X_MIN; x <= X_MAX; x++) {
      for (let y = Y_MIN; y <= Y_MAX; y++) {
        arr.push({
          gx: x,
          gy: y,
          key: coordKey(x, y),
          colors: emotionColor(x, y),
          auraDur: 6 + Math.random() * 4,
        });
      }
    }
    return arr;
  }, []);

  // Fetch curated + cached
  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API}/emotions`)
      .then((res) => {
        if (cancelled) return;
        const m = new Map();
        for (const e of res.data.emotions) {
          m.set(coordKey(e.x, e.y), {
            name: e.name,
            description: e.description,
            source: e.source,
          });
        }
        setEmotionMap(m);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load emotions", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Measure viewport (container is inside a scrollable wrapper)
  useEffect(() => {
    const measure = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setSize({ w, h });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Compute grid dimensions — enforce MIN_STEP between bubbles.
  // If viewport is too small, grid extends beyond and page scrolls.
  const gridDims = useMemo(() => {
    const viewportUsableW = size.w - PADDING_LEFT - PADDING_RIGHT;
    const viewportUsableH = size.h - PADDING_TOP - PADDING_BOTTOM;
    const stepX = Math.max(MIN_STEP, viewportUsableW / (GRID_COLS - 1));
    const stepY = Math.max(MIN_STEP, viewportUsableH / (GRID_ROWS - 1));
    const totalW = PADDING_LEFT + PADDING_RIGHT + stepX * (GRID_COLS - 1);
    const totalH = PADDING_TOP + PADDING_BOTTOM + stepY * (GRID_ROWS - 1);
    return { stepX, stepY, totalW, totalH };
  }, [size.w, size.h]);

  // Compute target positions - equal spacing across grid
  const targetFor = useCallback(
    (gx, gy) => {
      const { stepX, stepY } = gridDims;
      const cx = PADDING_LEFT + (gx - X_MIN) * stepX;
      // Invert y so +y is up on screen
      const cy = PADDING_TOP + (Y_MAX - gy) * stepY;
      return { x: cx, y: cy };
    },
    [gridDims],
  );

  // Initialize d3 simulation — only for hover physics (bubbles snap to grid otherwise)
  useEffect(() => {
    if (size.w === 0 || size.h === 0) return;

    const nodes = initialNodes.map((n, i) => {
      const prev = nodesRef.current[i];
      const t = targetFor(n.gx, n.gy);
      return {
        ...n,
        index: i,
        x: prev ? prev.x : t.x,
        y: prev ? prev.y : t.y,
        vx: 0,
        vy: 0,
        tx: t.x,
        ty: t.y,
        radius: BASE_RADIUS,
      };
    });
    nodesRef.current = nodes;

    // Position all bubbles immediately at their grid targets (no drift)
    for (const n of nodes) {
      const el = domRefs.current.get(n.key);
      if (el) {
        el.style.transform = `translate3d(${n.x - BASE_RADIUS}px, ${n.y - BASE_RADIUS}px, 0) scale(1)`;
      }
    }

    // Strong pull to targets — distant bubbles snap back instantly,
    // so hovering only nudges immediate neighbors.
    const sim = forceSimulation(nodes)
      .alphaDecay(0.12)
      .velocityDecay(0.55)
      .alphaMin(0.02)
      .force(
        "x",
        forceX((d) => d.tx).strength(0.9),
      )
      .force(
        "y",
        forceY((d) => d.ty).strength(0.9),
      )
      .force(
        "collide",
        forceCollide((d) => d.radius + 4).strength(1),
      )
      .stop()
      .on("tick", () => {
        for (const n of nodes) {
          const el = domRefs.current.get(n.key);
          if (!el) continue;
          const scale = n.hover ? HOVER_SCALE : 1;
          el.style.transform = `translate3d(${n.x - BASE_RADIUS}px, ${n.y - BASE_RADIUS}px, 0) scale(${scale})`;
        }
      })
      .on("end", () => {
        for (const n of nodes) {
          if (n.hover) continue;
          n.x = n.tx;
          n.y = n.ty;
          const el = domRefs.current.get(n.key);
          if (el)
            el.style.transform = `translate3d(${n.x - BASE_RADIUS}px, ${n.y - BASE_RADIUS}px, 0) scale(1)`;
        }
      });

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes, size.w, size.h]);

  // Hover handlers - only activate simulation on hover
  const handleEnter = useCallback((key) => {
    const node = nodesRef.current.find((n) => n.key === key);
    if (!node) return;
    node.hover = true;
    node.radius = BASE_RADIUS * HOVER_SCALE;
    setHoveredKey(key);
    if (simulationRef.current) {
      simulationRef.current.force(
        "collide",
        forceCollide((d) => d.radius + 4).strength(1),
      );
      simulationRef.current.alpha(0.4).restart();
    }
  }, []);

  const handleLeave = useCallback((key) => {
    const node = nodesRef.current.find((n) => n.key === key);
    if (!node) return;
    node.hover = false;
    node.radius = BASE_RADIUS;
    setHoveredKey((h) => (h === key ? null : h));
    if (simulationRef.current) {
      simulationRef.current.force(
        "collide",
        forceCollide((d) => d.radius + 4).strength(1),
      );
      simulationRef.current.alpha(0.4).restart();
    }
  }, []);

  const handleClick = useCallback(
    async (gx, gy) => {
      const key = coordKey(gx, gy);
      const cached = emotionMap.get(key);
      if (cached) {
        setSelected({ x: gx, y: gy, ...cached });
        setLoadingSelected(false);
        return;
      }
      setSelected(null);
      setLoadingSelected(true);
      try {
        const res = await axios.post(`${API}/emotions/generate`, {
          x: gx,
          y: gy,
        });
        const data = res.data;
        setEmotionMap((prev) => {
          const next = new Map(prev);
          next.set(key, {
            name: data.name,
            description: data.description,
            source: data.source,
          });
          return next;
        });
        setSelected({
          x: gx,
          y: gy,
          name: data.name,
          description: data.description,
          source: data.source,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Generate failed", err);
        setSelected({
          x: gx,
          y: gy,
          name: "Unnamed",
          description:
            "The cartographer couldn't reach this coordinate. Try again in a moment.",
          source: "error",
        });
      } finally {
        setLoadingSelected(false);
      }
    },
    [emotionMap],
  );

  const originScreen = useMemo(() => targetFor(0, 0), [targetFor]);
  const gridLeft = useMemo(() => targetFor(X_MIN, 0).x, [targetFor]);
  const gridRight = useMemo(() => targetFor(X_MAX, 0).x, [targetFor]);
  const gridTop = useMemo(() => targetFor(0, Y_MAX).y, [targetFor]);
  const gridBottom = useMemo(() => targetFor(0, Y_MIN).y, [targetFor]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: gridDims.totalW,
        height: gridDims.totalH,
        minWidth: "100vw",
        minHeight: "100vh",
      }}
      data-testid="emotion-grid"
    >
      {/* Axis lines through the center (behind bubbles) */}
      {size.w > 0 && (
        <>
          <div
            className="axis-line axis-line-x"
            style={{
              top: originScreen.y,
              left: gridLeft - 30,
              right: gridDims.totalW - gridRight - 30,
            }}
          />
          <div
            className="axis-line axis-line-y"
            style={{
              left: originScreen.x,
              top: gridTop - 30,
              bottom: gridDims.totalH - gridBottom - 30,
            }}
          />

          {/* Axis labels — OUTSIDE the bubble field */}
          <div
            className="axis-label axis-label-right"
            style={{ top: originScreen.y - 10, left: gridRight + 40 }}
            data-testid="axis-label-pleasant"
          >
            Pleasant →
          </div>
          <div
            className="axis-label axis-label-left"
            style={{ top: originScreen.y - 10, right: gridDims.totalW - gridLeft + 40 }}
            data-testid="axis-label-unpleasant"
          >
            ← Unpleasant
          </div>
          <div
            className="axis-label axis-label-top"
            style={{
              left: originScreen.x,
              top: gridTop - 60,
              transform: "translateX(-50%)",
            }}
            data-testid="axis-label-high-energy"
          >
            ↑ High Energy
          </div>
          <div
            className="axis-label axis-label-bottom"
            style={{
              left: originScreen.x,
              top: gridBottom + 44,
              transform: "translateX(-50%)",
            }}
            data-testid="axis-label-low-energy"
          >
            Low Energy ↓
          </div>
        </>
      )}

      {/* Bubbles */}
      {initialNodes.map((n) => {
        const isHovered = hoveredKey === n.key;
        const isSelected =
          selected && selected.x === n.gx && selected.y === n.gy;
        const cached = emotionMap.get(n.key);
        return (
          <div
            key={n.key}
            ref={(el) => {
              if (el) domRefs.current.set(n.key, el);
              else domRefs.current.delete(n.key);
            }}
            className={`bubble${isHovered ? " is-hovered" : ""}${isSelected ? " is-selected" : ""}`}
            style={{
              width: BASE_RADIUS * 2,
              height: BASE_RADIUS * 2,
              transformOrigin: "center center",
              "--bubble-color": n.colors.color,
              "--bubble-glow": n.colors.glow,
              "--aura-duration": `${n.auraDur}s`,
            }}
            onMouseEnter={() => handleEnter(n.key)}
            onMouseLeave={() => handleLeave(n.key)}
            onClick={() => handleClick(n.gx, n.gy)}
            data-testid={`emotion-bubble-${n.gx}-${n.gy}`}
            title={cached ? cached.name : `(${n.gx}, ${n.gy})`}
          >
            <div className="bubble-aura" aria-hidden="true" />
            <div className="bubble-core" aria-hidden="true" />
          </div>
        );
      })}

      <EmotionDetailPanel
        emotion={selected}
        loading={loadingSelected}
        onClose={() => {
          setSelected(null);
          setLoadingSelected(false);
        }}
      />
    </div>
  );
}
