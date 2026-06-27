import { useState } from "react";
import { api } from "../api";
import { Page, EntityCard, Stagger, useApi } from "../ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; // index = Mon0..Sun6

export default function Batches() {
  const list = useApi(() => api.get("/batches"));
  const tutors = useApi(() => api.get("/tutors?active_only=true"));
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);

  function toggleDay(d) {
    const days = new Set(form.days);
    days.has(d) ? days.delete(d) : days.add(d);
    setForm({ ...form, days: [...days].sort() });
  }

  async function create(e) {
    e.preventDefault();
    await api.post("/batches", {
      name: form.name,
      weekly_days: form.days.join(","),
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      default_tutor_id: form.default_tutor_id ? Number(form.default_tutor_id) : null,
    });
    setForm(null);
    list.reload();
  }

  async function generate(b) {
    const weeks = Number(prompt(`Generate sessions for "${b.name}" — how many weeks ahead?`, "4"));
    if (!weeks) return;
    const created = await api.post(`/sessions/${b.id}/generate`, { weeks });
    setMsg(`Created ${created.length} session(s) for ${b.name}.`);
  }

  return (
    <Page title="Batches" actions={<button className="btn" onClick={() => setForm({ name: "", days: [] })}>+ New batch</button>}>
      {msg && <div className="mb-3 rounded bg-sage/20 px-3 py-2 text-sm">{msg}</div>}

      {form && (
        <form onSubmit={create} className="card mb-4 space-y-3">
          <input className="input" placeholder="Batch name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="flex flex-wrap gap-1">
            {DAYS.map((d, i) => (
              <button type="button" key={d} onClick={() => toggleDay(i)}
                className={`rounded px-2 py-1 text-sm ${form.days.includes(i) ? "bg-terracotta text-white" : "border border-ink/20"}`}>
                {d}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">Start <input className="input" type="time" value={form.start_time || ""} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></label>
            <label className="text-sm">End <input className="input" type="time" value={form.end_time || ""} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></label>
            <label className="text-sm">Tutor
              <select className="input" value={form.default_tutor_id || ""} onChange={(e) => setForm({ ...form, default_tutor_id: e.target.value })}>
                <option value="">—</option>
                {(tutors.data || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <button className="btn">Save</button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      {(list.data || []).length ? (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(list.data || []).map((b) => (
            <EntityCard
              key={b.id}
              initial={(b.name || "?").charAt(0).toUpperCase()}
              title={b.name}
              badge={<span className="shrink-0 rounded-full bg-sage/20 px-2 py-0.5 text-xs text-ink/70">{b.student_count} students</span>}
              lines={[
                b.weekly_days.split(",").filter(Boolean).map((d) => DAYS[d]).join(", ") || "No days set",
                b.start_time ? `${b.start_time}–${b.end_time || ""}` : "No time set",
              ]}
              footer={<button className="btn-ghost text-sm" onClick={() => generate(b)}>Generate sessions</button>}
            />
          ))}
        </Stagger>
      ) : (
        <div className="card text-sm text-muted">No batches yet.</div>
      )}
    </Page>
  );
}
