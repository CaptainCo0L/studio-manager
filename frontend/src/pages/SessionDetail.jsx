import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { Page, useApi } from "../ui";

const STATUSES = ["present", "absent", "late", "excused"];
const STATUS_STYLE = {
  present: "bg-sage text-paper",
  absent: "bg-red-500 text-paper",
  late: "bg-ochre text-ink",
  excused: "bg-ink/40 text-paper",
};

export default function SessionDetail() {
  const { id } = useParams();
  const session = useApi(() => api.get(`/sessions/${id}`), [id]);
  const students = useApi(() => api.get("/students"));
  const [roster, setRoster] = useState([]); // [{student_id, status}]
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState(null);
  const [pay, setPay] = useState({ amount: "", method: "cash" });

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
    <Page title={`Session ${s.date}`}>
      {msg && <div className="mb-3 rounded bg-sage/20 px-3 py-2 text-sm">{msg}</div>}
      <div className="card mb-4 text-sm text-ink/70">
        <span className="capitalize">{s.session_type}</span>
        {s.start_time && <> · {s.start_time}–{s.end_time || ""}</>}
        {s.rate != null && <> · rate ₹{s.rate}</>}
      </div>

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
              Present {counts.present} · Absent {counts.absent} · Late {counts.late} · Excused {counts.excused}
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
