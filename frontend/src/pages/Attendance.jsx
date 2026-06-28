import { useEffect, useState } from "react";
import { api } from "../api";
import { Page, EmptyState, Loading, fmtDate, useApi } from "../ui";
import { useToast } from "../components/Toast";

const curMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const dayOf = (iso) => Number(iso.slice(8, 10));

// Tinted cells with colored letters — readable and WCAG-AA in both themes
// (solid fills + white text fail on the lighter dark-mode greens).
const CELL = {
  present: "bg-sage/15 text-sage ring-1 ring-inset ring-sage/30",
  absent: "bg-red-500/15 text-red-600 ring-1 ring-inset ring-red-500/30 dark:text-red-400",
};
const key = (sid, sessId) => `${sid}:${sessId}`;
// empty -> present -> absent -> present … (never back to empty: no delete endpoint)
const next = (cur) => (cur === "present" ? "absent" : "present");

export default function Attendance() {
  const toast = useToast();
  const batches = useApi(() => api.get("/attendance/batches"));
  const [batchId, setBatchId] = useState("");
  const [month, setMonth] = useState(curMonth());
  const grid = useApi(
    () => (batchId ? api.get(`/attendance/grid?batch_id=${batchId}&month=${month}`) : Promise.resolve(null)),
    [batchId, month]
  );
  const [marks, setMarks] = useState({}); // "studentId:sessionId" -> status

  useEffect(() => {
    if (!grid.data) return;
    const m = {};
    for (const mk of grid.data.marks) m[key(mk.student_id, mk.session_id)] = mk.status;
    setMarks(m);
  }, [grid.data]);

  async function send(sessId, items, optimistic) {
    setMarks((m) => ({ ...m, ...optimistic }));
    try {
      await api.post("/attendance/bulk", { session_id: sessId, items });
    } catch {
      toast.error("Couldn't save attendance — reverting.");
      grid.reload(); // revert to server truth
    }
  }

  function toggle(sid, sessId) {
    const status = next(marks[key(sid, sessId)]);
    send(sessId, [{ student_id: sid, status }], { [key(sid, sessId)]: status });
  }

  function allPresent(sessId) {
    const students = grid.data.students;
    const optimistic = Object.fromEntries(students.map((s) => [key(s.id, sessId), "present"]));
    send(sessId, students.map((s) => ({ student_id: s.id, status: "present" })), optimistic);
  }

  const data = grid.data;

  return (
    <Page title="Attendance">
      <div className="card mb-4 flex flex-wrap items-center gap-2">
        <select className="input max-w-xs" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
          <option value="">Select batch…</option>
          {(batches.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input className="input max-w-[12rem]" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {!batchId ? (
        <EmptyState title="Pick a batch" hint="Choose a batch and month to mark attendance." />
      ) : !data ? (
        <Loading />
      ) : data.sessions.length === 0 ? (
        <EmptyState title="No sessions this month" hint="There are no sessions for this batch in the selected month." />
      ) : data.students.length === 0 ? (
        <EmptyState title="No students enrolled" hint="Enrol students into this batch first." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-paper px-3 py-2 text-left font-semibold">Student</th>
                {data.sessions.map((s) => (
                  <th key={s.id} className="px-2 py-2 text-center font-medium" title={fmtDate(s.date)}>
                    <div>{dayOf(s.date)}</div>
                    <button className="mt-1 text-xs text-sage hover:underline" title="Mark all present" onClick={() => allPresent(s.id)}>✓ all</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.students.map((st) => (
                <tr key={st.id} className="border-t border-ink/10">
                  <td className="sticky left-0 z-10 bg-paper px-3 py-2 font-medium">{st.name}</td>
                  {data.sessions.map((s) => {
                    const status = marks[key(st.id, s.id)];
                    return (
                      <td key={s.id} className="px-1 py-1 text-center">
                        <button
                          onClick={() => toggle(st.id, s.id)}
                          title={fmtDate(s.date)}
                          aria-label={`${st.name} — ${status || "not marked"}`}
                          className={`h-9 w-9 rounded-md text-sm font-bold transition-colors ${status ? CELL[status] : "border border-ink/20 text-ink/25 hover:border-ink/30 hover:bg-ink/5"}`}
                        >
                          {status === "present" ? "P" : status === "absent" ? "A" : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">Click a cell to cycle present / absent. Green = present, red = absent, empty = not marked.</p>
        </div>
      )}
    </Page>
  );
}
