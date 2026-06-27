import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Page, Table, useApi } from "../ui";

export default function Sessions() {
  const [filters, setFilters] = useState({ batch_id: "", date_from: "", date_to: "" });
  const batches = useApi(() => api.get("/batches"));
  const tutors = useApi(() => api.get("/tutors?active_only=true"));
  const students = useApi(() => api.get("/students"));
  const [form, setForm] = useState(null);

  const qs = Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join("&");
  const list = useApi(() => api.get(`/sessions?${qs}`), [qs]);

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

      <Table
        columns={[
          { label: "Date", sort: (s) => s.date },
          { label: "Type", sort: (s) => s.session_type },
          { label: "Batch", sort: (s) => s.batch_id ?? 0 },
          "",
        ]}
        rows={list.data || []}
        render={(s) => (
          <>
            <td className="td">{s.date}</td>
            <td className="td capitalize">{s.session_type}</td>
            <td className="td">{s.batch_id ? `#${s.batch_id}` : "—"}</td>
            <td className="td text-right"><Link className="text-terracotta hover:underline" to={`/sessions/${s.id}`}>Open</Link></td>
          </>
        )}
      />
    </Page>
  );
}
