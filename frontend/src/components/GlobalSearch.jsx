import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const ROUTE = {
  student: (h) => `/students/${h.id}`,
  batch: () => "/batches",
  tutor: () => "/tutors",
};

export default function GlobalSearch({ onNavigate }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const navigate = useNavigate();
  const boxRef = useRef(null);

  // Debounced search.
  useEffect(() => {
    const term = q.trim();
    if (!term) { setRes(null); return; }
    const t = setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(term)}`).then(setRes).catch(() => setRes(null));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setRes(null); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function go(type, hit) {
    navigate(ROUTE[type](hit));
    setQ("");
    setRes(null);
    onNavigate?.();
  }

  const groups = res
    ? [["Students", "student", res.students], ["Batches", "batch", res.batches], ["Tutors", "tutor", res.tutors]]
    : [];
  const hasResults = groups.some(([, , items]) => items.length);

  return (
    <div ref={boxRef} className="relative px-3 pb-2">
      <input
        className="input"
        placeholder="Search…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && (setQ(""), setRes(null))}
      />
      {res && (
        <div className="absolute left-3 right-3 z-30 mt-1 max-h-80 overflow-auto rounded-md border border-ink/15 bg-paper shadow-lg">
          {hasResults ? (
            groups.map(([label, type, items]) =>
              items.length > 0 ? (
                <div key={type}>
                  <div className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">{label}</div>
                  {items.map((h) => (
                    <button key={`${type}-${h.id}`} onClick={() => go(type, h)} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-canvas/60">
                      <span className="text-ink">{h.label}</span>
                      {h.sublabel && <span className="text-muted"> · {h.sublabel}</span>}
                    </button>
                  ))}
                </div>
              ) : null
            )
          ) : (
            <div className="px-3 py-3 text-sm text-muted">No matches.</div>
          )}
        </div>
      )}
    </div>
  );
}
