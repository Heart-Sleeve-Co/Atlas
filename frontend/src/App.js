import { useEffect, useState } from "react";
import "@/App.css";
import EmotionGrid from "@/components/EmotionGrid";
import ThemeToggle from "@/components/ThemeToggle";
import PanZoom from "@/components/PanZoom";

const THEME_KEY = "emotions-theme";

export default function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "cosmic";
    return localStorage.getItem(THEME_KEY) || "cosmic";
  });

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

      <aside className="glass-panel legend" data-testid="legend">
        <strong>How to read this</strong>
        Horizontal — unpleasant ↔ pleasant. Vertical — low energy ↔ high energy.
        Hover to nudge; click for meaning.
      </aside>
    </div>
  );
}
