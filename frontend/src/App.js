import { useEffect, useState } from "react";
import "@/App.css";
import EmotionGrid from "@/components/EmotionGrid";
import EmotionDetailPanel from "@/components/EmotionDetailPanel";
import ThemeToggle from "@/components/ThemeToggle";
import PanZoom from "@/components/PanZoom";
import { HelpCircle } from "lucide-react";

const THEME_KEY = "emotions-theme";

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "cosmic";
    return localStorage.getItem(THEME_KEY) || "cosmic";
  });
  const [legendOpen, setLegendOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loadingSelected, setLoadingSelected] = useState(false);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Click on empty canvas (or outside the grid) clears the selection —
  // so the highlight / neighbour glow fades back to the resting atlas.
  const handleAppClick = (e) => {
    // Ignore clicks that were part of a pan gesture (PanZoom sets .panning).
    const vp = document.querySelector(".pz-viewport");
    if (vp && vp.classList.contains("panning")) return;
    if (
      e.target.closest(
        '[data-testid^="emotion-bubble-"], .detail-panel, .app-header, .pz-controls, .legend',
      )
    )
      return;
    setSelected(null);
    setLoadingSelected(false);
  };

  return (
    <div className="app-root" data-testid="app-root" onClick={handleAppClick}>
      <div className="ambient-bg" aria-hidden="true">
        <div className="stars" />
      </div>

      <header className="app-header">
        <div className="brand" data-testid="brand-header">
          <h1>Atlas</h1>
          <p>an emotion map</p>
          <p className="brand-credit" data-testid="brand-credit">
            by Heart &amp; Sleeve Co.
          </p>
        </div>
        <ThemeToggle theme={theme} onChange={setTheme} />
      </header>

      <PanZoom>
        <EmotionGrid
          theme={theme}
          selected={selected}
          setSelected={setSelected}
          loadingSelected={loadingSelected}
          setLoadingSelected={setLoadingSelected}
        />
      </PanZoom>

      {/* HUD detail panel — always visible in the bottom-left, rendered
          OUTSIDE PanZoom so its position:fixed is anchored to the viewport. */}
      <EmotionDetailPanel
        emotion={selected}
        loading={loadingSelected}
        onClose={() => {
          setSelected(null);
          setLoadingSelected(false);
        }}
      />

      <aside
        className={`glass-panel legend${legendOpen ? " is-open" : " is-closed"}`}
        data-testid="legend"
      >
        <button
          type="button"
          className="legend-header"
          onClick={() => setLegendOpen((v) => !v)}
          aria-expanded={legendOpen}
          aria-controls="legend-body"
          aria-label={legendOpen ? "Hide help" : "Show help"}
          data-testid="legend-toggle"
        >
          <HelpCircle size={14} strokeWidth={1.8} />
        </button>
        <div
          id="legend-body"
          className="legend-body"
          data-testid="legend-body"
          aria-hidden={!legendOpen}
        >
          <p>
            <strong>Horizontal</strong> — painful ↔ pleasant.
            <br />
            <strong>Vertical</strong> — low energy ↔ high energy.
          </p>
          <p>Click any bubble to see the meaning of that emotion.</p>
        </div>
      </aside>
    </div>
  );
}
