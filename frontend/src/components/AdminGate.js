import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Lock, LogOut, Loader2 } from "lucide-react";
import AdminEditor from "@/components/AdminEditor";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
// sessionStorage (not localStorage) so the passphrase is cleared when the
// tab closes — narrows the XSS-exfiltration window for the shared editor
// passphrase.
const STORAGE_KEY = "atlas-admin-passphrase";

export default function AdminGate() {
  const [passphrase, setPassphrase] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) || "",
  );
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");

  // Verify stored passphrase on mount
  useEffect(() => {
    if (!passphrase) {
      setChecking(false);
      return;
    }
    axios
      .post(`${API}/admin/verify`, { passphrase })
      .then(() => setAuthed(true))
      .catch(() => {
        sessionStorage.removeItem(STORAGE_KEY);
        setPassphrase("");
      })
      .finally(() => setChecking(false));
  }, [passphrase]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!input.trim()) return;
      setError("");
      setChecking(true);
      try {
        await axios.post(`${API}/admin/verify`, { passphrase: input });
        sessionStorage.setItem(STORAGE_KEY, input);
        setPassphrase(input);
        setAuthed(true);
      } catch (err) {
        setError(
          err.response?.status === 401
            ? "Incorrect passphrase."
            : "Couldn't verify — check the backend.",
        );
      } finally {
        setChecking(false);
      }
    },
    [input],
  );

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setPassphrase("");
    setAuthed(false);
    setInput("");
  }, []);

  if (checking) {
    return (
      <div className="admin-loading" data-testid="admin-loading">
        <Loader2 className="spin" size={20} />
        <span>Checking passphrase…</span>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin-gate" data-testid="admin-gate">
        <form
          className="admin-gate-card glass-panel"
          onSubmit={handleSubmit}
          data-testid="admin-gate-form"
        >
          <div className="admin-gate-icon">
            <Lock size={22} strokeWidth={1.6} />
          </div>
          <h1>Editor access</h1>
          <p>Enter the editor passphrase to unlock the atlas admin.</p>
          <input
            type="password"
            className="admin-gate-input"
            placeholder="Passphrase"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            data-testid="admin-gate-input"
          />
          {error && (
            <p className="admin-gate-error" data-testid="admin-gate-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="admin-gate-submit"
            disabled={!input.trim()}
            data-testid="admin-gate-submit"
          >
            Unlock
          </button>
          <a className="admin-gate-back" href="/">
            ← Back to the atlas
          </a>
        </form>
      </div>
    );
  }

  return <AdminEditor passphrase={passphrase} onLogout={handleLogout} />;
}
