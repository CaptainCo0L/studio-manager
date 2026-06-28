import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { Page, PAYMENT_METHODS, useApi } from "../ui";

// Attendance is marked on the dedicated Attendance page; this page is session
// info + edit, plus recording a payment for private/dropin sessions.
export default function SessionDetail() {
  const { id } = useParams();
  const session = useApi(() => api.get(`/sessions/${id}`), [id]);
  const tutors = useApi(() => api.get("/tutors?active_only=true"));
  const batches = useApi(() => api.get("/batches"));
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
          {s.session_type === "batch" && <> · <a className="text-terracotta hover:underline" href="/attendance">Mark attendance →</a></>}
        </div>
      )}

      {isPrivate && (
        <>
          <h2 className="mb-2 mt-6 font-semibold">Record payment</h2>
          <form onSubmit={recordPayment} className="card flex flex-wrap items-end gap-3">
            <label className="text-sm">Amount (₹) <input className="input" type="number" step="0.01" required value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></label>
            <label className="text-sm">Method
              <select className="input" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <button className="btn">Record</button>
          </form>
        </>
      )}
    </Page>
  );
}
