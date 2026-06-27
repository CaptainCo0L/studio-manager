import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { Page, useApi } from "../ui";

const STATUSES = ["present", "absent"];
const STATUS_STYLE = {
  present: "bg-sage text-white",
  absent: "bg-red-500 text-white",
};

// Tutor view of one of their sessions: mark the roster (present/absent) only.
export default function TutorSessionDetail() {
  const { id } = useParams();
  const session = useApi(() => api.get(`/sessions/${id}`), [id]);
  const [roster, setRoster] = useState([]); // [{student_id, student_name, status}]
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api.get(`/attendance/roster/${id}`).then((rows) => {
      setRoster(rows.map((r) => ({ student_id: r.student_id, student_name: r.student_name, status: r.status })));
      setDirty(false);
    });
  }, [id]);

  function setStatus(sid, status) {
    setRoster((r) => r.map((x) => (x.student_id === sid ? { ...x, status } : x)));
    setDirty(true);
  }
  function markAll(status) {
    setRoster((r) => r.map((x) => ({ ...x, status })));
    setDirty(true);
  }
  async function save() {
    await api.post("/attendance/bulk", {
      session_id: Number(id),
      items: roster.map(({ student_id, status }) => ({ student_id, status })),
    });
    setMsg("Attendance saved.");
    setDirty(false);
  }

  if (!session.data) return <Page title="Session">{session.error || "Loading…"}</Page>;
  const s = session.data;
  const counts = STATUSES.reduce((a, st) => ({ ...a, [st]: roster.filter((r) => r.status === st).length }), {});

  return (
    <Page title={`Session ${s.date}`}>
      {msg && <div className="mb-3 rounded bg-sage/20 px-3 py-2 text-sm">{msg}</div>}
      <div className="card mb-4 text-sm text-ink/70">
        <span className="capitalize">{s.session_type}</span>
        {s.start_time && <> · {s.start_time}–{s.end_time || ""}</>}
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
            <div className="text-xs text-muted">Present {counts.present} · Absent {counts.absent}</div>
          </div>
          {roster.map((r) => (
            <div key={r.student_id} className="flex items-center justify-between">
              <span>{r.student_name}</span>
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
            <button className="btn" onClick={save}>Save attendance</button>
            {dirty && <span className="text-xs text-ochre">● Unsaved changes</span>}
          </div>
        </div>
      )}
    </Page>
  );
}
