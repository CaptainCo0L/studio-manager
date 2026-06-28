import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { Page, useApi } from "../ui";

const STATUSES = ["present", "absent"];
const STATUS_STYLE = {
  present: "bg-sage text-white",
  absent: "bg-red-500 text-white",
};

export default function SessionDetail() {
  const { id } = useParams();
  const session = useApi(() => api.get(`/sessions/${id}`), [id]);
  const students = useApi(() => api.get("/students"));
  const tutors = useApi(() => api.get("/tutors?active_only=true"));
  const batches = useApi(() => api.get("/batches"));
  const [roster, setRoster] = useState([]); // [{student_id, status}]
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState(null);
  const [pay, setPay] = useState({ amount: "", method: "cash" });
  const [edit, setEdit] = useState(null); // edit session details

  async function saveSession(e) {
    e.preventDefault();
    await api.put(`/sessions/${id}`, {
      session_type: edit.session_type,
      date: edit.date,
      start_time: edit.start_time || null,
      end_time: edit.end_time || null,
      rate: edit.rate ? Number(edit.rate) : null,
      tutor_id: edit.tutor_id ? Number(edit.tutor_id) : null,
      batch_id: edit.session_type === "batch" && edit.batch_id ? Number(edit.batch_id) : null,
      notes: edit.notes || null,
    });
    setEdit(null);
    setMsg("Session updated.");
    session.reload();
  }

  // Auto-fill roster from enrollment on load (backend seeds 'present' for batch sessions).
  useEffect(() => {
    api.get(`/attendance/roster/${id}`).then((rows) => {
      setRoster(rows.map((r) => ({ student_id: r.student_id, status: r.status })));
      setDirty(false);
    });
  }, [id]);

  const nameOf = (sid) => (students.data || []).find((s) => s.id === sid)?.name || `#${sid}`;

  function setStatus(sid, status) {
    setRoster((r) => r.map((x) => (x.student_id === sid ? { ...x, status } : x)));
    setDirty(true);
  }

  function markAll(status) {
    setRoster((r) => r.map((x) => ({ ...x, status })));
    setDirty(true);
  }

  async function saveRoster() {
    await api.post("/attendance/bulk", { session_id: Number(id), items: roster });
    setMsg("Attendance saved.");
    setDirty(false);
  }

  async function recordPayment(e) {
    e.preventDefault();
    await api.post("/payments", {
      amount: Number(pay.amount),
      method: pay.method,
      session_id: Number(id),
    });
    setMsg("Payment recorded.");
    setPay({ amount: "", method: "cash" });
  }

  if (!session.data) return <Page title="Session">{session.error || "Loading…"}</Page>;
  const s = session.data;
  const isPrivate = s.session_type !== "batch";
  const counts = STATUSES.reduce((acc, st) => ({ ...acc, [st]: roster.filter((r) => r.status === st).length }), {});

  return (
    <Page
      title={`Session ${s.date}`}
      actions={<button className="btn-ghost" onClick={() => setEdit({ session_type: s.session_type, date: s.date, start_time: s.start_time, end_time: s.end_time, rate: s.rate, tutor_id: s.tutor_id, batch_id: s.batch_id, notes: s.notes })}>Edit</button>}
    >
      {msg && <div className="mb-3 rounded bg-sage/20 px-3 py-2 text-sm">{msg}</div>}
      {edit ? (
        <form onSubmit={saveSession} className="card mb-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm">Type
            <select className="input mt-1" value={edit.session_type} onChange={(e) => setEdit({ ...edit, session_type: e.target.value })}>
              <option value="batch">Batch</option>
              <option value="private">Private</option>
              <option value="dropin">Drop-in</option>
            </select>
          </label>
          <label className="text-sm">Date <input className="input mt-1" type="date" required value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></label>
          <label className="text-sm">Tutor
            <select className="input mt-1" value={edit.tutor_id || ""} onChange={(e) => setEdit({ ...edit, tutor_id: e.target.value })}>
              <option value="">—</option>
              {(tutors.data || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          {edit.session_type === "batch" ? (
            <label className="text-sm">Batch
              <select className="input mt-1" value={edit.batch_id || ""} onChange={(e) => setEdit({ ...edit, batch_id: e.target.value })}>
                <option value="">—</option>
                {(batches.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          ) : (
            <label className="text-sm">Rate (₹) <input className="input mt-1" type="number" step="0.01" value={edit.rate || ""} onChange={(e) => setEdit({ ...edit, rate: e.target.value })} /></label>
          )}
          <label className="text-sm md:col-span-2">Notes <input className="input mt-1" value={edit.notes || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
          <div className="flex gap-2 md:col-span-3">
            <button className="btn">Update</button>
            <button type="button" className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="card mb-4 text-sm text-ink/70">
          <span className="capitalize">{s.session_type}</span>
          {s.start_time && <> · {s.start_time}–{s.end_time || ""}</>}
          {s.rate != null && <> · rate ₹{s.rate}</>}
        </div>
      )}

      <h2 className="mb-2 font-semibold">Roster</h2>
      {roster.length === 0 ? (
        <div className="card text-sm text-ink/60">No students on this session.</div>
      ) : (
        <div className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-3">
            <div className="flex gap-2">
              <button className="btn-ghost text-xs" onClick={() => markAll("present")}>Mark all present</button>
              <button className="btn-ghost text-xs" onClick={() => markAll("absent")}>Mark all absent</button>
            </div>
            <div className="text-xs text-muted">
              Present {counts.present} · Absent {counts.absent}
            </div>
          </div>
          {roster.map((r) => (
            <div key={r.student_id} className="flex items-center justify-between">
              <span>{nameOf(r.student_id)}</span>
              <div className="flex gap-1">
                {STATUSES.map((st) => (
                  <button key={st} onClick={() => setStatus(r.student_id, st)}
                    className={`rounded px-2 py-1 text-xs capitalize transition-colors ${r.status === st ? STATUS_STYLE[st] : "border border-ink/20 text-ink hover:bg-ink/5"}`}>
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-1">
            <button className="btn" onClick={saveRoster}>Save attendance</button>
            {dirty && <span className="text-xs text-ochre">● Unsaved changes</span>}
          </div>
        </div>
      )}

      {isPrivate && (
        <>
          <h2 className="mb-2 mt-6 font-semibold">Record payment</h2>
          <form onSubmit={recordPayment} className="card flex flex-wrap items-end gap-3">
            <label className="text-sm">Amount (₹) <input className="input" type="number" step="0.01" required value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></label>
            <label className="text-sm">Method
              <select className="input" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
                {["cash", "card", "upi", "bank_transfer", "other"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <button className="btn">Record</button>
          </form>
        </>
      )}
    </Page>
  );
}
