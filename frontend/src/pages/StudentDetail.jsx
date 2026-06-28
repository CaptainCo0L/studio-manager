import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { Page, Table, useApi } from "../ui";

const MARK = {
  present: { icon: "✓", word: "", cls: "text-sage" },
  absent: { icon: "✗", word: "", cls: "text-red-600" },
};
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function Marker({ status }) {
  const m = MARK[status] || { icon: "•", word: status, cls: "text-ink/40" };
  return (
    <span className={`flex items-center gap-0.5 ${m.cls}`}>
      {m.icon && <span className="text-lg font-bold leading-none">{m.icon}</span>}
      {m.word && <span className="text-sm font-semibold leading-none">{m.word}</span>}
    </span>
  );
}

function AttendanceCalendar({ items }) {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const byDate = {};
  for (const it of items) (byDate[it.date] ||= []).push(it);

  const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Mon-based offset
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  const step = (delta) => {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };
  const iso = (d) => `${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <button className="btn-ghost px-2.5 py-1" onClick={() => step(-1)} aria-label="Previous month">‹</button>
        <div className="font-display text-lg font-semibold text-ink">{MONTHS[view.m]} {view.y}</div>
        <button className="btn-ghost px-2.5 py-1" onClick={() => step(1)} aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((w) => <div key={w} className="py-1 text-muted">{w}</div>)}
        {cells.map((d, i) => {
          const items = d ? byDate[iso(d)] || [] : [];
          const scheduled = items.some((it) => !it.status);
          const marked = items.filter((it) => it.status);
          return (
            <div
              key={i}
              className={`min-h-[4.5rem] rounded-md border p-1 ${
                !d ? "border-transparent" : scheduled ? "border-ochre/40 bg-ochre/15" : "border-ink/10"
              }`}
            >
              {d && <div className="text-right text-xs text-ink/50">{d}</div>}
              {marked.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                  {marked.map((it) => (
                    <Link
                      key={it.session_id}
                      to={`/sessions/${it.session_id}`}
                      title={`${it.session_type} — ${it.status}`}
                      className="hover:opacity-70"
                    >
                      <Marker status={it.status} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1"><span className="text-base font-bold text-sage">✓</span> Present</span>
        <span className="flex items-center gap-1"><span className="text-base font-bold text-red-600">✗</span> Absent</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-4 rounded-sm border border-ochre/40 bg-ochre/15" /> Scheduled</span>
      </div>
    </div>
  );
}

export default function StudentDetail() {
  const { id } = useParams();
  const student = useApi(() => api.get(`/students/${id}`), [id]);
  const enrolled = useApi(() => api.get(`/students/${id}/batches`), [id]);
  const allBatches = useApi(() => api.get("/batches"));
  const calendar = useApi(() => api.get(`/students/${id}/attendance-calendar`), [id]);
  const [batchId, setBatchId] = useState("");
  const [form, setForm] = useState(null); // edit student details

  async function save(e) {
    e.preventDefault();
    await api.put(`/students/${id}`, {
      name: form.name,
      guardian_name: form.guardian_name || null,
      guardian_phone: form.guardian_phone || null,
      guardian_email: form.guardian_email || null,
      notes: form.notes || null,
    });
    setForm(null);
    student.reload();
  }

  async function enroll() {
    if (!batchId) return;
    await api.post("/students/enroll", { student_id: Number(id), batch_id: Number(batchId) });
    setBatchId("");
    enrolled.reload();
  }
  async function unenroll(bid) {
    await api.post("/students/unenroll", { student_id: Number(id), batch_id: bid });
    enrolled.reload();
  }

  if (!student.data) return <Page title="Student">{student.error || "Loading…"}</Page>;
  const s = student.data;

  return (
    <Page
      title={s.name}
      actions={<button className="btn-ghost" onClick={() => setForm({ name: s.name, guardian_name: s.guardian_name, guardian_phone: s.guardian_phone, guardian_email: s.guardian_email, notes: s.notes })}>Edit</button>}
    >
      {form ? (
        <form onSubmit={save} className="card mb-4 grid gap-3 md:grid-cols-2">
          <input className="input" placeholder="Student name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Guardian name" value={form.guardian_name || ""} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} />
          <input className="input" placeholder="Guardian phone" value={form.guardian_phone || ""} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} />
          <input className="input" type="email" placeholder="Guardian email" value={form.guardian_email || ""} onChange={(e) => setForm({ ...form, guardian_email: e.target.value })} />
          <div className="flex gap-2 md:col-span-2">
            <button className="btn">Update</button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="card">
          <h2 className="mb-2 font-semibold">Guardian</h2>
          <p className="text-sm text-ink/70">{s.guardian_name || "—"}</p>
          <p className="text-sm text-ink/70">{s.guardian_phone || "—"}</p>
          <p className="text-sm text-ink/70">{s.guardian_email || "—"}</p>
        </div>
      )}

      <h2 className="mb-2 mt-6 font-semibold">Batches</h2>
      <div className="card mb-3 flex flex-wrap items-center gap-2">
        <select className="input max-w-xs" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
          <option value="">Enroll in batch…</option>
          {(allBatches.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button className="btn" onClick={enroll}>Enroll</button>
      </div>
      <Table
        columns={[
          { label: "Batch", sort: (b) => b.name },
          { label: "Classes/week", sort: (b) => b.classes_per_week },
          "",
        ]}
        rows={enrolled.data || []}
        empty="Not enrolled in any batch."
        render={(b) => (
          <>
            <td className="td font-medium">{b.name}</td>
            <td className="td">{b.classes_per_week}× / week</td>
            <td className="td text-right"><button className="text-red-700 hover:underline" onClick={() => unenroll(b.id)}>Unenroll</button></td>
          </>
        )}
      />

      <h2 className="mb-2 mt-6 font-semibold">Attendance</h2>
      {calendar.data ? <AttendanceCalendar items={calendar.data} /> : <div className="card text-sm text-muted">Loading…</div>}
    </Page>
  );
}
