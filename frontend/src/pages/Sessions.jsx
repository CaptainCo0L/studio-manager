import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Page, Table, Card, fmtDate, localISO, useApi } from "../ui";

function SessionCard({ label, badge, emptyText, session }) {
  const chip = <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badge}`}>{label}</span>;
  if (!session) {
    return (
      <div className="card flex min-h-[9rem] flex-col">
        {chip}
        <div className="flex flex-1 items-center justify-center text-sm text-muted">{emptyText}</div>
      </div>
    );
  }
  return (
    <Link to={`/sessions/${session.id}`} className="block">
      <Card hover className="flex min-h-[9rem] flex-col">
        {chip}
        <div className="mt-2 font-display text-lg font-semibold text-ink">{fmtDate(session.date)}</div>
        <div className="mt-1 space-y-0.5 text-sm text-muted">
          <div className="capitalize">{session.session_type}{session.batch_name ? ` · ${session.batch_name}` : ""}</div>
          <div>{session.start_time ? `${session.start_time}–${session.end_time || ""}` : "Time not set"}</div>
          <div>{session.tutor_name || "No tutor"}</div>
        </div>
      </Card>
    </Link>
  );
}

export default function Sessions() {
  const [filters, setFilters] = useState({ batch_id: "", date_from: "", date_to: "" });
  const batches = useApi(() => api.get("/batches"));
  const tutors = useApi(() => api.get("/tutors?active_only=true"));
  const students = useApi(() => api.get("/students"));
  const [form, setForm] = useState(null);

  const qs = Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join("&");
  const list = useApi(() => api.get(`/sessions?${qs}`), [qs]);

  // Bucket the (date-desc) filtered list into prev / today / next, rest go in the list.
  const rows = list.data || [];
  const today = localISO(new Date());
  const previous = rows.find((s) => s.date < today) || null;
  const current = rows.find((s) => s.date === today) || null;
  const future = rows.filter((s) => s.date > today);
  const next = future.length ? future[future.length - 1] : null;
  const featured = new Set([previous, current, next].filter(Boolean).map((s) => s.id));
  const others = rows.filter((s) => !featured.has(s.id));

  async function create(e) {
    e.preventDefault();
    await api.post("/sessions", {
      session_type: form.session_type,
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      rate: form.rate ? Number(form.rate) : null,
      tutor_id: form.tutor_id ? Number(form.tutor_id) : null,
      batch_id: form.session_type === "batch" && form.batch_id ? Number(form.batch_id) : null,
      student_id: form.student_id ? Number(form.student_id) : null,
    });
    setForm(null);
    list.reload();
  }

  const blank = { session_type: "batch", date: "" };

  return (
    <Page title="Sessions" actions={<button className="btn" onClick={() => setForm(blank)}>+ New session</button>}>
      <div className="card mb-4 flex flex-wrap gap-2">
        <select className="input max-w-xs" value={filters.batch_id} onChange={(e) => setFilters({ ...filters, batch_id: e.target.value })}>
          <option value="">All batches</option>
          {(batches.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input className="input max-w-[10rem]" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
        <input className="input max-w-[10rem]" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
      </div>

      {form && (
        <form onSubmit={create} className="card mb-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm">Type
            <select className="input" value={form.session_type} onChange={(e) => setForm({ ...form, session_type: e.target.value })}>
              <option value="batch">Batch</option>
              <option value="private">Private</option>
              <option value="dropin">Drop-in</option>
            </select>
          </label>
          <label className="text-sm">Date <input className="input" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label className="text-sm">Tutor
            <select className="input" value={form.tutor_id || ""} onChange={(e) => setForm({ ...form, tutor_id: e.target.value })}>
              <option value="">—</option>
              {(tutors.data || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>

          {form.session_type === "batch" ? (
            <label className="text-sm">Batch
              <select className="input" value={form.batch_id || ""} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}>
                <option value="">—</option>
                {(batches.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          ) : (
            <>
              <label className="text-sm">Student
                <select className="input" value={form.student_id || ""} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
                  <option value="">—</option>
                  {(students.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="text-sm">Rate (₹) <input className="input" type="number" step="0.01" value={form.rate || ""} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></label>
            </>
          )}

          <div className="flex gap-2 md:col-span-3">
            <button className="btn">Save</button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SessionCard label="Previous" badge="bg-ink/10 text-muted" emptyText="No previous session" session={previous} />
        <SessionCard label="Today" badge="bg-terracotta/15 text-clay" emptyText="No session today" session={current} />
        <SessionCard label="Next" badge="bg-sage/20 text-ink" emptyText="No upcoming session" session={next} />
      </div>

      <h2 className="mb-2 font-semibold">All sessions</h2>
      <Table
        columns={[
          { label: "Date", sort: (s) => s.date },
          { label: "Type", sort: (s) => s.session_type },
          { label: "Batch", sort: (s) => s.batch_name || "" },
          "",
        ]}
        rows={others}
        empty="No other sessions."
        render={(s) => (
          <>
            <td className="td">{s.date}</td>
            <td className="td capitalize">{s.session_type}</td>
            <td className="td">{s.batch_name || "—"}</td>
            <td className="td text-right"><Link className="text-terracotta hover:underline" to={`/sessions/${s.id}`}>Open</Link></td>
          </>
        )}
      />
    </Page>
  );
}
