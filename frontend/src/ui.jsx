import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

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
    <div>
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

export function Table({ columns, rows, render, empty = "Nothing here yet." }) {
  if (!rows?.length) return <div className="card text-sm text-muted">{empty}</div>;
  return (
    <div className="card overflow-x-auto p-0">
      <table className="min-w-full divide-y divide-ink/10">
        <thead className="bg-canvas/60">
          <tr>{columns.map((c) => <th key={c} className="th">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-ink/5">
          {rows.map((r, i) => <tr key={r.id ?? i} className="transition-colors hover:bg-canvas/40">{render(r)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
