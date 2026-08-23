import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ theme, onChange }) {
  return (
    <div className="theme-toggle" data-testid="theme-toggle">
      <button
        type="button"
        className={theme === "ethereal" ? "active" : ""}
        onClick={() => onChange("ethereal")}
        data-testid="theme-toggle-ethereal"
        aria-label="Light mode"
      >
        <Sun size={14} strokeWidth={1.6} />
        Light Mode
      </button>
      <button
        type="button"
        className={theme === "cosmic" ? "active" : ""}
        onClick={() => onChange("cosmic")}
        data-testid="theme-toggle-cosmic"
        aria-label="Dark mode"
      >
        <Moon size={14} strokeWidth={1.6} />
        Dark Mode
      </button>
    </div>
  );
}
