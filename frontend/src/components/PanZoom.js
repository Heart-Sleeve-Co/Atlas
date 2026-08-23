import { useRef, useEffect, useState, useCallback } from "react";
import { Plus, Minus, Maximize2 } from "lucide-react";

const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.15;

/**
 * PanZoom: wraps children in a translate+scale transform driven by
 *  - mouse drag / touch drag  → pan
 *  - wheel                    → zoom to cursor
 *  - two-finger pinch         → zoom to midpoint
 *  - zoom-in / zoom-out / reset buttons
 *
 * The wrapped content keeps its own coordinate system — hover physics,
 * click handlers, etc. work unchanged.
 */
export default function PanZoom({ children, initialFit = true }) {
  const viewportRef = useRef(null);
  const surfaceRef = useRef(null);
  const stateRef = useRef({ x: 0, y: 0, scale: 1 });
  const [scale, setScale] = useState(1); // used only to update button labels
  const gestureRef = useRef(null);

  // Apply transform to the DOM directly (avoid re-render per frame)
  const applyTransform = useCallback(() => {
    if (!surfaceRef.current) return;
    const { x, y, scale: s } = stateRef.current;
    surfaceRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
  }, []);

  // Fit the surface content into the viewport on mount / resize
  const fitToViewport = useCallback(() => {
    const vp = viewportRef.current;
    const surf = surfaceRef.current;
    if (!vp || !surf) return;
    const vpRect = vp.getBoundingClientRect();
    // Read natural (untransformed) size of surface via scrollWidth/Height
    // Temporarily reset transform to measure
    const prevTransform = surf.style.transform;
    surf.style.transform = "none";
    const contentW = surf.scrollWidth;
    const contentH = surf.scrollHeight;
    surf.style.transform = prevTransform;

    if (contentW === 0 || contentH === 0) return;
    const scaleX = vpRect.width / contentW;
    const scaleY = vpRect.height / contentH;
    const fitScale = Math.min(scaleX, scaleY, 1); // never zoom past 1x on fit
    const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale));
    const scaledW = contentW * s;
    const scaledH = contentH * s;
    // Center
    const x = (vpRect.width - scaledW) / 2;
    const y = (vpRect.height - scaledH) / 2;
    stateRef.current = { x, y, scale: s };
    setScale(s);
    applyTransform();
  }, [applyTransform]);

  useEffect(() => {
    // Wait a beat for children to render, then fit
    const id = requestAnimationFrame(() => {
      if (initialFit) fitToViewport();
      else applyTransform();
    });
    const onResize = () => {
      // Refit on resize
      if (initialFit) fitToViewport();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", onResize);
    };
  }, [initialFit, fitToViewport, applyTransform]);

  const zoomTo = useCallback(
    (newScale, cx, cy) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const vpRect = vp.getBoundingClientRect();
      // If no anchor provided, zoom to viewport center
      if (cx == null || cy == null) {
        cx = vpRect.width / 2;
        cy = vpRect.height / 2;
      }
      const { x, y, scale: s } = stateRef.current;
      const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
      // Keep the world point under (cx, cy) fixed:
      //   worldX = (cx - x) / s
      //   new x  = cx - worldX * clamped
      const worldX = (cx - x) / s;
      const worldY = (cy - y) / s;
      stateRef.current = {
        x: cx - worldX * clamped,
        y: cy - worldY * clamped,
        scale: clamped,
      };
      setScale(clamped);
      applyTransform();
    },
    [applyTransform],
  );

  // Wheel zoom
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e) => {
      e.preventDefault();
      const vpRect = vp.getBoundingClientRect();
      const cx = e.clientX - vpRect.left;
      const cy = e.clientY - vpRect.top;
      const delta = -e.deltaY;
      const factor = Math.exp(delta * 0.0015);
      const { scale: s } = stateRef.current;
      zoomTo(s * factor, cx, cy);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [zoomTo]);

  // Pointer drag pan + pinch
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const pointers = new Map();

    const isDraggableTarget = (target) => {
      // Don't start a pan gesture from an interactive element inside the surface
      // (e.g. bubble hover/click should still work).
      // Instead: allow pan only when the pointer is on empty surface OR
      // when the user holds Space / middle-click. To keep it feeling map-like,
      // we allow pan from any target except direct interactive bubbles/panels
      // on the FIRST movement threshold — clicks under threshold still fire.
      return true;
    };

    const onPointerDown = (e) => {
      if (!isDraggableTarget(e.target)) return;
      // Middle mouse or left mouse only
      if (e.button != null && e.button !== 0 && e.button !== 1) return;
      // Skip if the target is an interactive control we shouldn't hijack
      if (e.target.closest && e.target.closest(".pz-controls, .app-header, .detail-panel, .legend")) {
        return;
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        gestureRef.current = {
          type: "pan",
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          origX: stateRef.current.x,
          origY: stateRef.current.y,
          moved: false,
          captured: false,
        };
      } else if (pointers.size === 2) {
        const [p1, p2] = Array.from(pointers.values());
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        gestureRef.current = {
          type: "pinch",
          startDist: dist,
          startScale: stateRef.current.scale,
          midX,
          midY,
          origX: stateRef.current.x,
          origY: stateRef.current.y,
          moved: true,
        };
      }
    };

    const onPointerMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gestureRef.current;
      if (!g) return;

      if (g.type === "pan" && pointers.size === 1) {
        const dx = e.clientX - g.startX;
        const dy = e.clientY - g.startY;
        if (!g.moved && Math.hypot(dx, dy) > 5) {
          g.moved = true;
          vp.classList.add("panning");
          // Only NOW capture the pointer — after a real drag begins.
          // This preserves click events for buttons/bubbles on quick taps.
          try {
            vp.setPointerCapture(g.pointerId);
            g.captured = true;
          } catch (_) {
            /* ignore */
          }
        }
        if (g.moved) {
          stateRef.current.x = g.origX + dx;
          stateRef.current.y = g.origY + dy;
          applyTransform();
        }
      } else if (g.type === "pinch" && pointers.size >= 2) {
        const [p1, p2] = Array.from(pointers.values());
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const newScale = g.startScale * (dist / g.startDist);
        const vpRect = vp.getBoundingClientRect();
        const cx = g.midX - vpRect.left;
        const cy = g.midY - vpRect.top;
        const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
        const worldX = (cx - g.origX) / g.startScale;
        const worldY = (cy - g.origY) / g.startScale;
        stateRef.current = {
          x: cx - worldX * clamped,
          y: cy - worldY * clamped,
          scale: clamped,
        };
        setScale(clamped);
        applyTransform();
      }
    };

    const onPointerUp = (e) => {
      if (!pointers.has(e.pointerId)) return;
      const g = gestureRef.current;
      pointers.delete(e.pointerId);
      if (g && g.captured) {
        try {
          vp.releasePointerCapture(e.pointerId);
        } catch (_) {
          /* ignore */
        }
      }
      if (pointers.size === 0) {
        setTimeout(() => vp.classList.remove("panning"), 0);
        gestureRef.current = null;
      } else if (pointers.size === 1 && g && g.type === "pinch") {
        const [p] = Array.from(pointers.values());
        gestureRef.current = {
          type: "pan",
          startX: p.x,
          startY: p.y,
          origX: stateRef.current.x,
          origY: stateRef.current.y,
          moved: true,
          captured: false,
        };
      }
    };

    const onClickCapture = (e) => {
      // Only suppress clicks that originated INSIDE the surface after a pan gesture.
      // Clicks on the zoom controls (siblings of surface) must always fire.
      if (!vp.classList.contains("panning")) return;
      if (!e.target.closest(".pz-surface")) return;
      e.stopPropagation();
      e.preventDefault();
    };

    vp.addEventListener("pointerdown", onPointerDown);
    vp.addEventListener("pointermove", onPointerMove);
    vp.addEventListener("pointerup", onPointerUp);
    vp.addEventListener("pointercancel", onPointerUp);
    vp.addEventListener("click", onClickCapture, true);
    return () => {
      vp.removeEventListener("pointerdown", onPointerDown);
      vp.removeEventListener("pointermove", onPointerMove);
      vp.removeEventListener("pointerup", onPointerUp);
      vp.removeEventListener("pointercancel", onPointerUp);
      vp.removeEventListener("click", onClickCapture, true);
    };
  }, [applyTransform]);

  const zoomIn = () => zoomTo(stateRef.current.scale + ZOOM_STEP);
  const zoomOut = () => zoomTo(stateRef.current.scale - ZOOM_STEP);
  const reset = () => fitToViewport();

  return (
    <div className="pz-viewport" ref={viewportRef} data-testid="panzoom-viewport">
      <div className="pz-surface" ref={surfaceRef}>
        {children}
      </div>

      <div className="pz-controls glass-panel" data-testid="panzoom-controls">
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
          data-testid="zoom-in"
        >
          <Plus size={16} strokeWidth={1.7} />
        </button>
        <div className="pz-scale" data-testid="zoom-level">
          {Math.round(scale * 100)}%
        </div>
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom out"
          data-testid="zoom-out"
        >
          <Minus size={16} strokeWidth={1.7} />
        </button>
        <div className="pz-divider" />
        <button
          type="button"
          onClick={reset}
          aria-label="Reset view"
          data-testid="zoom-reset"
        >
          <Maximize2 size={14} strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}
