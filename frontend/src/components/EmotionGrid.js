import { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
  forceSimulation,
  forceX,
  forceY,
  forceCollide,
} from "d3-force";
import { emotionColor } from "@/components/emotionColors";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Grid config (matches backend) - 14x14 = 196 emotions (no coords on x=0 or y=0)
const X_MIN = -7,
  X_MAX = 7;
const Y_MIN = -7,
  Y_MAX = 7;
const GRID_COLS = X_MAX - X_MIN; // 14 (skips 0)
const GRID_ROWS = Y_MAX - Y_MIN; // 14 (skips 0)

// Layout constants — reserve space around the grid for axis labels
const PADDING_TOP = 140; // room for header + top axis label
const PADDING_BOTTOM = 200; // room for bottom axis label + legend
const PADDING_LEFT = 220; // room for left axis label
const PADDING_RIGHT = 220; // room for right axis label

// Bubble sizing — bubbles 50% larger than baseline, with tighter spacing
const BASE_RADIUS = 27;
// Scale factor applied to a bubble when it is selected (clicked).
const SELECTED_SCALE = 1.5;
// Extra clearance (in px) around a selected bubble's outer highlight so
// its outline never touches neighboring bubbles.
const SELECTED_PADDING = 10;
// Minimum spacing between adjacent bubble centers — tight (marble-like).
const MIN_STEP = 64;

// How long the CSS scale transition on .bubble-scale lasts — must match CSS.
const SHRINK_MS = 420;

// easeOutBack — mirrors the CSS cubic-bezier(0.34, 1.35, 0.5, 1). Used on
// the GROW phase so the collision radius leads the visual scale slightly.
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// easeOutCubic — non-overshooting; used on SHRINK so the collision radius
// never dips below the CSS scale-down (would cause a mid-animation crowd).
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function coordKey(x, y) {
  return `${x},${y}`;
}

// Step one grid cell in direction d (-1, 0, +1). If we'd land on the skipped
// zero axis, jump across to the next valid coord (e.g. from -1 stepping +1
// goes to +1, not 0).
function stepAxis(v, d) {
  if (d === 0) return v;
  const nv = v + d;
  if (nv === 0) return v + 2 * d;
  return nv;
}

function inBounds(x, y) {
  return x >= X_MIN && x <= X_MAX && y >= Y_MIN && y <= Y_MAX && x !== 0 && y !== 0;
}

// The 8 immediate grid neighbours of (x, y), axis-aware.
function neighborKeysOf(x, y) {
  const out = new Set();
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = stepAxis(x, dx);
      const ny = stepAxis(y, dy);
      if (inBounds(nx, ny)) out.add(coordKey(nx, ny));
    }
  }
  return out;
}

export default function EmotionGrid({ selected, setSelected, loadingSelected, setLoadingSelected }) {
  const nodesRef = useRef([]);
  const domRefs = useRef(new Map());
  const simulationRef = useRef(null);
  const [emotionMap, setEmotionMap] = useState(new Map());

  // Precompute 196 nodes (skip anything on x=0 or y=0)
  const initialNodes = useMemo(() => {
    const arr = [];
    for (let x = X_MIN; x <= X_MAX; x++) {
      if (x === 0) continue;
      for (let y = Y_MIN; y <= Y_MAX; y++) {
        if (y === 0) continue;
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
            color: e.color || null,
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

  // Compute grid dimensions — fixed logical spacing; PanZoom handles fit-to-view.
  const gridDims = useMemo(() => {
    const stepX = MIN_STEP;
    const stepY = MIN_STEP;
    const totalW = PADDING_LEFT + PADDING_RIGHT + stepX * GRID_COLS;
    const totalH = PADDING_TOP + PADDING_BOTTOM + stepY * GRID_ROWS;
    return { stepX, stepY, totalW, totalH };
  }, []);

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

  // Initialize d3 simulation — pushes neighbors when a bubble is selected
  useEffect(() => {
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

    // Softer positional pull so neighbors can drift; collision force is set
    // once here and uses `iterations(3)` so a single tick can converge the
    // non-overlap constraint even during large radius changes.
    const sim = forceSimulation(nodes)
      .alphaDecay(0.08)
      .velocityDecay(0.5)
      .alphaMin(0.005)
      .force(
        "x",
        forceX((d) => d.tx).strength(0.5),
      )
      .force(
        "y",
        forceY((d) => d.ty).strength(0.5),
      )
      .force(
        "collide",
        forceCollide((d) => d.radius + 4).strength(1).iterations(3),
      )
      .stop()
      .on("tick", () => {
        // Only translate here; scale is CSS-driven so it can transition smoothly
        for (const n of nodes) {
          const el = domRefs.current.get(n.key);
          if (!el) continue;
          el.style.transform = `translate3d(${n.x - BASE_RADIUS}px, ${n.y - BASE_RADIUS}px, 0)`;
        }
      });
    // No `.on("end", ...)` — a hard teleport there would create a visible
    // one-frame snap. animateNodeRadius keeps the sim converging each rAF frame.

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes]);

  // Ramp a node's collision radius over `duration` ms using rAF. Each frame:
  //  - update node.radius via easeOutBack (matches the CSS scale curve)
  //  - keep alpha alive so forceX/forceY pull neighbors home during shrink
  //  - call sim.tick() a few times so collision converges within THIS frame,
  //    instead of trailing behind by many ticks (which caused the highlight
  //    to briefly overlap neighbors during the growth transition).
  // Also biases the radius slightly ahead of the CSS scale so the visual
  // gap between the selected bubble's highlight and its neighbors never dips
  // below the resting gap.
  // Ramp both physics AND visual for a node from its current state to target.
  // Explicit start/end scales avoid deriving visual scale from the collision
  // radius (which is padded and would produce a visible pop).
  const animateNodeRadius = useCallback(
    (node, targetRadius, startScale, endScale, duration) => {
      if (node._radiusRaf) cancelAnimationFrame(node._radiusRaf);
      const startRadius = node.radius;
      const isGrow = targetRadius > startRadius;
      const ease = isGrow ? easeOutBack : easeOutCubic;
      const start = performance.now();
      const sim = simulationRef.current;
      const bubbleEl = domRefs.current.get(node.key);
      const scaleEl = bubbleEl ? bubbleEl.querySelector(".bubble-scale") : null;
      if (sim) sim.alpha(0.5);
      const step = () => {
        const now = performance.now();
        const t = Math.min(1, (now - start) / duration);
        const eased = ease(t);
        node.radius = startRadius + (targetRadius - startRadius) * eased;
        if (scaleEl) {
          const s = startScale + (endScale - startScale) * eased;
          scaleEl.style.transform = `scale(${s})`;
        }
        if (sim) {
          // Re-init forceCollide's cached radii so per-frame node.radius takes effect.
          const collide = sim.force("collide");
          if (collide) collide.radius(collide.radius());
          sim.alpha(Math.max(sim.alpha(), 0.2));
          sim.tick(5);
          // Only write transforms for nodes whose position actually changed.
          for (const n of nodesRef.current) {
            if (n._prevX === n.x && n._prevY === n.y) continue;
            n._prevX = n.x;
            n._prevY = n.y;
            const el = domRefs.current.get(n.key);
            if (!el) continue;
            el.style.transform = `translate3d(${n.x - BASE_RADIUS}px, ${n.y - BASE_RADIUS}px, 0)`;
          }
        }
        if (t < 1) {
          node._radiusRaf = requestAnimationFrame(step);
        } else {
          node._radiusRaf = null;
          // Pin the final visual scale via inline style so nothing snaps.
          if (scaleEl) scaleEl.style.transform = `scale(${endScale})`;
          // If we just finished a shrink, release the pin so neighbors can settle.
          if (!isGrow) {
            node.fx = null;
            node.fy = null;
          }
          if (sim) sim.alpha(0.25).restart();
        }
      };
      node._radiusRaf = requestAnimationFrame(step);
    },
    [],
  );

  // Sync selected state into node physics. useLayoutEffect fires BEFORE paint,
  // so we can set the frame-0 inline transform on the .bubble-scale element
  // before the browser renders — no snap-to-full-size flash.
  useLayoutEffect(() => {
    const nodes = nodesRef.current;
    if (!nodes.length) return;
    for (const n of nodes) {
      const isSel = selected && selected.x === n.gx && selected.y === n.gy;
      if (isSel && !n.selected) {
        n.selected = true;
        // Pin the selected node at its rest target so collision push affects
        // only the neighbors (selected bubble doesn't drift under physics).
        n.fx = n.tx;
        n.fy = n.ty;
        // Set inline scale(1) synchronously before paint, then ramp up.
        const scaleEl = domRefs.current
          .get(n.key)
          ?.querySelector(".bubble-scale");
        if (scaleEl) scaleEl.style.transform = "scale(1)";
        animateNodeRadius(
          n,
          BASE_RADIUS * SELECTED_SCALE + SELECTED_PADDING,
          1,
          SELECTED_SCALE,
          SHRINK_MS,
        );
      } else if (!isSel && n.selected) {
        n.selected = false;
        // Set inline scale(SELECTED_SCALE) synchronously before paint, then ramp down.
        const scaleEl = domRefs.current
          .get(n.key)
          ?.querySelector(".bubble-scale");
        if (scaleEl) scaleEl.style.transform = `scale(${SELECTED_SCALE})`;
        animateNodeRadius(n, BASE_RADIUS, SELECTED_SCALE, 1, SHRINK_MS);
      }
    }
  }, [selected, animateNodeRadius]);

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
    [emotionMap, setSelected, setLoadingSelected],
  );

  const originScreen = useMemo(() => targetFor(0, 0), [targetFor]);
  const gridLeft = useMemo(() => targetFor(X_MIN, 0).x, [targetFor]);
  const gridRight = useMemo(() => targetFor(X_MAX, 0).x, [targetFor]);
  const gridTop = useMemo(() => targetFor(0, Y_MAX).y, [targetFor]);
  const gridBottom = useMemo(() => targetFor(0, Y_MIN).y, [targetFor]);

  // Immediate-neighbour keys of the current selection (axis-aware).
  const neighborKeys = useMemo(() => {
    if (!selected) return null;
    return neighborKeysOf(selected.x, selected.y);
  }, [selected]);

  return (
    <div
      style={{
        position: "relative",
        width: gridDims.totalW,
        height: gridDims.totalH,
      }}
      data-testid="emotion-grid"
    >
      {/* Axis lines through the center (behind bubbles) */}
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

      {/* Bubbles */}
      {initialNodes.map((n) => {
        const isSelected =
          selected && selected.x === n.gx && selected.y === n.gy;
        const isNeighbor = !!neighborKeys && neighborKeys.has(n.key);
        const isDimmed = !!selected && !isSelected && !isNeighbor;
        const cached = emotionMap.get(n.key);
        // Custom color override from admin, if any — falls back to computed.
        const customColor = cached?.color;
        const bubbleColor = customColor || n.colors.color;
        const bubbleGlow = customColor
          ? `${customColor}8c` // ~55% alpha
          : n.colors.glow;
        const cls = `bubble${isSelected ? " is-selected" : ""}${
          isNeighbor ? " is-neighbor" : ""
        }${isDimmed ? " is-dimmed" : ""}`;
        return (
          <div
            key={n.key}
            ref={(el) => {
              if (el) domRefs.current.set(n.key, el);
              else domRefs.current.delete(n.key);
            }}
            className={cls}
            style={{
              width: BASE_RADIUS * 2,
              height: BASE_RADIUS * 2,
              transformOrigin: "center center",
              "--bubble-color": bubbleColor,
              "--bubble-glow": bubbleGlow,
              "--aura-duration": `${n.auraDur}s`,
            }}
            onClick={() => handleClick(n.gx, n.gy)}
            data-testid={`emotion-bubble-${n.gx}-${n.gy}`}
            title={cached ? cached.name : `(${n.gx}, ${n.gy})`}
          >
            <div className="bubble-scale">
              <div className="bubble-aura" aria-hidden="true" />
              <div className="bubble-core" aria-hidden="true" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
