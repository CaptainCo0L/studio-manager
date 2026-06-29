import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { Page, Table, Loading, useApi } from "../ui";
import { useToast } from "../components/Toast";

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

// Monday (local) that starts the week containing `dateStr` ("YYYY-MM-DD").
function weekMonday(dateStr) {
  const d = new Date(dateStr + "T00:00"); // local midnight, no TZ drift
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back up to Monday
  return d;
}
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shortDay = (d) => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;

function AttendanceWeeks({ items }) {
  // ponytail: full history, newest-first; add a "show older" cap if a long-running student's list grows unwieldy.
  const weeks = {};
  for (const it of items) (weeks[isoDay(weekMonday(it.date))] ||= []).push(it);
  const keys = Object.keys(weeks).sort().reverse();

  return (
    <div className="card">
      {keys.length === 0 && <p className="text-sm text-muted">No sessions yet.</p>}
      {keys.map((k) => {
        const mon = new Date(k + "T00:00");
        const sun = new Date(mon);
        sun.setDate(sun.getDate() + 6);
        const sessions = [...weeks[k]].sort((a, b) => a.date.localeCompare(b.date));
        const marked = sessions.filter((it) => it.status);
        const present = marked.filter((it) => it.status === "present").length;
        return (
          <div key={k} className="border-b border-ink/10 py-3 last:border-0">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="font-display font-semibold text-ink">{shortDay(mon)} – {shortDay(sun)}</div>
              {marked.length > 0 && <div className="text-xs text-muted">{present}/{marked.length} present</div>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {sessions.map((it) => {
                const d = new Date(it.date + "T00:00");
                return (
                  <Link
                    key={it.session_id}
                    to={`/sessions/${it.session_id}`}
                    title={`${it.session_type} — ${it.status || "scheduled"}`}
                    className="flex items-center gap-1.5 hover:opacity-70"
                  >
                    <span className="text-xs text-ink/60">{WEEKDAYS[(d.getDay() + 6) % 7]} {d.getDate()}</span>
                    <Marker status={it.status} />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1"><span className="text-base font-bold text-sage">✓</span> Present</span>
        <span className="flex items-center gap-1"><span className="text-base font-bold text-red-600">✗</span> Absent</span>
        <span className="flex items-center gap-1"><span className="text-base font-bold text-ink/40">•</span> Scheduled</span>
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
  const toast = useToast();

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
    try {
      await api.post("/students/enroll", { student_id: Number(id), batch_id: Number(batchId) });
      setBatchId("");
      toast.success("Enrolled.");
      enrolled.reload();
    } catch (err) {
      toast.error(err.message);
    }
  }
  async function unenroll(bid) {
    try {
      await api.post("/students/unenroll", { student_id: Number(id), batch_id: bid });
      toast.success("Unenrolled.");
      enrolled.reload();
    } catch (err) {
      toast.error(err.message);
    }
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
      {calendar.data ? <AttendanceWeeks items={calendar.data} /> : <Loading />}
    </Page>
  );
}
