import { useEffect, useState } from "react";

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
