import { useEffect, useState } from "react";
import "@/App.css";
import EmotionGrid from "@/components/EmotionGrid";
import ThemeToggle from "@/components/ThemeToggle";
import PanZoom from "@/components/PanZoom";
import { ChevronDown, HelpCircle } from "lucide-react";

const THEME_KEY = "emotions-theme";

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "cosmic";
    return localStorage.getItem(THEME_KEY) || "cosmic";
  });
  const [legendOpen, setLegendOpen] = useState(false);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return (
    <div className="app-root" data-testid="app-root">
      <div className="ambient-bg" aria-hidden="true">
        <div className="stars" />
      </div>

      <header className="app-header">
        <div className="brand" data-testid="brand-header">
          <h1>The Feeling Field</h1>
          <p>an atlas of emotion</p>
        </div>
        <ThemeToggle theme={theme} onChange={setTheme} />
      </header>

      <PanZoom>
        <EmotionGrid theme={theme} />
      </PanZoom>

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
          data-testid="legend-toggle"
        >
          <span className="legend-title">
            <HelpCircle size={13} strokeWidth={1.7} />
            How to read this
          </span>
          <ChevronDown
            className={`legend-chevron${legendOpen ? " open" : ""}`}
            size={14}
            strokeWidth={1.8}
          />
        </button>
        <div
          id="legend-body"
          className="legend-body"
          data-testid="legend-body"
          aria-hidden={!legendOpen}
        >
          <p>
            <strong>Horizontal</strong> — unpleasant ↔ pleasant.
            <br />
            <strong>Vertical</strong> — low energy ↔ high energy.
          </p>
          <p>Click any bubble to see the meaning of that emotion.</p>
        </div>
      </aside>
    </div>
  );
}
