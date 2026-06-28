import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// Shared date/format helpers (previously duplicated across pages).
export const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
export const fmtDateShort = (d) => String(d).slice(0, 10);
export const fmtMonth = (m) => {
  if (!m) return "—";
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1).toLocaleString(undefined, { month: "long", year: "numeric" });
};
export const localISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const PAYMENT_METHODS = ["cash", "card", "upi", "bank_transfer", "other"];

// Tiny data-loading hook: runs fn, exposes {data, loading, error, reload}.
export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.resolve(fn())
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => (alive = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}

export function Page({ title, actions, children }) {
  return (
    <div className="animate-fade-rise">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        <div className="flex gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}

export function Card({ hover = false, className = "", children }) {
  return (
    <div className={`card ${hover ? "transition hover:-translate-y-0.5 hover:shadow-md" : ""} ${className}`}>
      {children}
    </div>
  );
}

// Gallery tile for browse pages. initial = avatar letter, lines = fact strings,
// footer = optional action row (rendered below the facts; omit `to` when present).
export function EntityCard({ to, title, initial, lines = [], badge, footer }) {
  const inner = (
    <Card hover={!!to} className="flex h-full gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-terracotta/15 font-display text-lg font-semibold text-clay" aria-hidden="true">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="truncate font-medium text-ink">{title}</div>
          {badge}
        </div>
        {lines.map((l, i) => (
          <div key={i} className="truncate text-sm text-muted">{l}</div>
        ))}
        {footer && <div className="mt-2">{footer}</div>}
      </div>
    </Card>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}

export function Animate({ delay = 0, className = "", children }) {
  return (
    <div className={`animate-fade-rise ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

// Wraps each child with an incrementing mount delay for a staggered grid.
export function Stagger({ children, step = 40, className = "" }) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, i) => (
        <Animate delay={i * step}>{child}</Animate>
      ))}
    </div>
  );
}

// Stable comparator for a column's sort accessor. Numbers compare numerically,
// everything else by localeCompare on the string form.
function compareBy(sort, dir) {
  const mul = dir === "desc" ? -1 : 1;
  return (a, b) => {
    const va = sort(a.row), vb = sort(b.row);
    let c;
    if (typeof va === "number" && typeof vb === "number") c = va - vb;
    else c = String(va ?? "").localeCompare(String(vb ?? ""));
    return c !== 0 ? mul * c : a.i - b.i; // original index keeps it stable
  };
}

export function Table({ columns, rows, render, empty = "Nothing here yet.", onRowClick, filter }) {
  // Normalize columns to { label, sort?, align? }.
  const cols = columns.map((c) => (typeof c === "string" ? { label: c } : c));
  const anySort = cols.some((c) => c.sort);
  const showFilter = filter ?? anySort;

  const [sortIdx, setSortIdx] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [query, setQuery] = useState("");

  if (!rows?.length) return <div className="card text-sm text-muted">{empty}</div>;

  // Filter: keep rows whose any sortable column contains the query.
  const q = query.trim().toLowerCase();
  let view = rows;
  if (q) {
    view = rows.filter((r) =>
      cols.some((c) => c.sort && String(c.sort(r) ?? "").toLowerCase().includes(q))
    );
  }
  // Sort: decorate with original index for stability, then sort a copy.
  if (sortIdx != null && cols[sortIdx]?.sort) {
    view = view
      .map((row, i) => ({ row, i }))
      .sort(compareBy(cols[sortIdx].sort, sortDir))
      .map((d) => d.row);
  }

  const toggleSort = (i) => {
    if (sortIdx !== i) { setSortIdx(i); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else setSortIdx(null); // asc → desc → off
  };
  const arrow = (i) => (sortIdx !== i ? "↕" : sortDir === "asc" ? "▲" : "▼");

  return (
    <div>
      {showFilter && (
        <input
          className="input mb-3 max-w-xs"
          placeholder="Filter…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <div className="card overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-ink/10">
          <thead className="bg-canvas/60">
            <tr>
              {cols.map((c, i) => (
                <th key={i} className={`th ${c.align === "right" ? "text-right" : ""}`}>
                  {c.sort ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(i)}
                      className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider hover:text-ink"
                    >
                      {c.label}
                      <span className={sortIdx === i ? "text-terracotta" : "text-muted/40"}>{arrow(i)}</span>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {view.length ? (
              view.map((r, i) => (
                <tr
                  key={r.id ?? i}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={`transition-colors hover:bg-canvas/40 ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {render(r)}
                </tr>
              ))
            ) : (
              <tr><td colSpan={cols.length} className="td text-muted">No matches.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
