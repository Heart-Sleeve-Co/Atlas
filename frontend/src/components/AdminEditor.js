import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { Save, Check, Loader2, ExternalLink, LogOut } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function coordKey(x, y) {
  return `${x},${y}`;
}

export default function AdminEditor({ passphrase, onLogout }) {
  const [entries, setEntries] = useState([]); // sorted top-to-bottom, left-to-right
  const [grid, setGrid] = useState({
    x_min: -6,
    x_max: 6,
    y_min: -6,
    y_max: 6,
  });
  const [status, setStatus] = useState({}); // key -> "idle" | "saving" | "saved" | "error"
  const [loading, setLoading] = useState(true);
  const [activeColumn, setActiveColumn] = useState(0); // which x column is visible
  const timers = useRef({}); // debounce timers per key
  const authHeaders = { headers: { "X-Admin-Passphrase": passphrase } };

  useEffect(() => {
    axios
      .get(`${API}/admin/emotions`, authHeaders)
      .then((res) => {
        setEntries(res.data.entries);
        setGrid(res.data.grid);
      })
      .catch((err) => {
        console.error(err);
        if (err.response?.status === 401) {
          onLogout?.();
        } else {
          alert("Failed to load emotions. Is the backend running?");
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group entries by x-column, sorted by y descending (top-to-bottom).
  // Skip x=0 — no valid coords along the axis.
  const columns = [];
  for (let x = grid.x_min; x <= grid.x_max; x++) {
    if (x === 0) continue;
    const col = entries
      .filter((e) => e.x === x)
      .sort((a, b) => b.y - a.y); // +y at top
    columns.push({ x, entries: col });
  }

  const saveEntry = useCallback((x, y, name, description) => {
    const key = coordKey(x, y);
    setStatus((s) => ({ ...s, [key]: "saving" }));
    axios
      .put(`${API}/admin/emotions/${x}/${y}`, { name, description }, authHeaders)
      .then(() => {
        setStatus((s) => ({ ...s, [key]: "saved" }));
        setTimeout(() => {
          setStatus((s) => {
            if (s[key] !== "saved") return s;
            const next = { ...s };
            delete next[key];
            return next;
          });
        }, 1400);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          onLogout?.();
          return;
        }
        setStatus((s) => ({ ...s, [key]: "error" }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback(
    (x, y, field, value) => {
      const key = coordKey(x, y);
      setEntries((es) =>
        es.map((e) => (e.x === x && e.y === y ? { ...e, [field]: value } : e)),
      );
      // Debounce save per cell
      if (timers.current[key]) clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => {
        const current =
          entries.find((e) => e.x === x && e.y === y) || {
            name: "",
            description: "",
          };
        const merged = { ...current, [field]: value };
        saveEntry(x, y, merged.name, merged.description);
      }, 700);
    },
    [entries, saveEntry],
  );

  const totalTodo = entries.filter((e) =>
    e.name.startsWith("TODO"),
  ).length;
  const totalDone = entries.length - totalTodo;

  if (loading) {
    return (
      <div className="admin-loading" data-testid="admin-loading">
        <Loader2 className="spin" size={20} />
        <span>Loading atlas…</span>
      </div>
    );
  }

  return (
    <div className="admin-root" data-testid="admin-root">
      <header className="admin-header">
        <div className="admin-brand">
          <h1>Atlas — Editor</h1>
          <p>
            {totalDone} / {entries.length} entries written · {totalTodo}{" "}
            placeholders remaining
          </p>
        </div>
        <div className="admin-header-actions">
          <a
            className="admin-view-link"
            href="/"
            data-testid="admin-view-link"
          >
            <ExternalLink size={13} strokeWidth={1.7} />
            Open the atlas
          </a>
          <button
            type="button"
            className="admin-view-link"
            onClick={onLogout}
            data-testid="admin-logout"
          >
            <LogOut size={13} strokeWidth={1.7} />
            Log out
          </button>
        </div>
      </header>

      <nav className="admin-column-nav" data-testid="admin-column-nav">
        <span className="admin-column-nav-label">Jump to column (x):</span>
        {columns.map((col) => {
          const colTodo = col.entries.filter((e) =>
            e.name.startsWith("TODO"),
          ).length;
          return (
            <button
              key={col.x}
              type="button"
              className={`admin-column-chip${activeColumn === col.x ? " active" : ""}${colTodo === 0 ? " done" : ""}`}
              onClick={() => {
                setActiveColumn(col.x);
                const el = document.getElementById(`col-${col.x}`);
                if (el)
                  el.scrollIntoView({
                    behavior: "smooth",
                    inline: "start",
                    block: "nearest",
                  });
              }}
              data-testid={`admin-column-chip-${col.x}`}
            >
              {col.x >= 0 ? `+${col.x}` : col.x}
              {colTodo > 0 && (
                <span className="admin-column-chip-count">{colTodo}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="admin-columns" data-testid="admin-columns">
        {columns.map((col) => (
          <section
            key={col.x}
            id={`col-${col.x}`}
            className="admin-column"
            data-testid={`admin-column-${col.x}`}
          >
            <header className="admin-column-header">
              <span className="admin-column-x">
                x {col.x >= 0 ? "+" : ""}
                {col.x}
              </span>
              <span className="admin-column-title">
                {col.x < 0
                  ? "Unpleasant"
                  : col.x > 0
                    ? "Pleasant"
                    : "Neutral"}
              </span>
            </header>
            <div className="admin-column-body">
              {col.entries.map((e) => {
                const key = coordKey(e.x, e.y);
                const cellStatus = status[key];
                const isTodo = e.name.startsWith("TODO");
                return (
                  <div
                    key={key}
                    className={`admin-cell${isTodo ? " is-todo" : ""}`}
                    data-testid={`admin-cell-${e.x}-${e.y}`}
                  >
                    <div className="admin-cell-header">
                      <span className="admin-cell-coord">
                        y {e.y >= 0 ? "+" : ""}
                        {e.y}
                      </span>
                      <span className="admin-cell-status">
                        {cellStatus === "saving" && (
                          <Loader2 className="spin" size={12} />
                        )}
                        {cellStatus === "saved" && (
                          <Check size={12} strokeWidth={2.2} />
                        )}
                        {cellStatus === "error" && (
                          <span className="admin-error">save failed</span>
                        )}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="admin-name-input"
                      placeholder="Emotion name"
                      value={e.name}
                      onChange={(ev) =>
                        handleChange(e.x, e.y, "name", ev.target.value)
                      }
                      data-testid={`admin-name-${e.x}-${e.y}`}
                    />
                    <textarea
                      className="admin-desc-input"
                      placeholder="One-sentence description…"
                      rows={3}
                      value={e.description}
                      onChange={(ev) =>
                        handleChange(
                          e.x,
                          e.y,
                          "description",
                          ev.target.value,
                        )
                      }
                      data-testid={`admin-desc-${e.x}-${e.y}`}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <footer className="admin-footer" data-testid="admin-footer">
        <Save size={13} strokeWidth={1.7} />
        Changes save automatically 0.7 seconds after you stop typing.
      </footer>
    </div>
  );
}
