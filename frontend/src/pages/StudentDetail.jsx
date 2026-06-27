import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Page, Table, inr, useApi } from "../ui";

const DOT = {
  present: "bg-sage",
  late: "bg-ochre",
  absent: "bg-red-500",
  excused: "bg-ink/30",
};
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function Legend({ className, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
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
        {cells.map((d, i) => (
          <div key={i} className={`min-h-[3.25rem] rounded-md border p-1 ${d ? "border-ink/10" : "border-transparent"}`}>
            {d && <div className="text-right text-[0.7rem] text-ink/50">{d}</div>}
            {d && (byDate[iso(d)] || []).length > 0 && (
              <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                {byDate[iso(d)].map((it) => (
                  <Link
                    key={it.session_id}
                    to={`/sessions/${it.session_id}`}
                    title={`${it.session_type} — ${it.status || "scheduled"}`}
                    className={`h-2.5 w-2.5 rounded-full ${it.status ? DOT[it.status] || "bg-ink/30" : "border border-ink/40"}`}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <Legend className="bg-sage" label="Present" />
        <Legend className="bg-ochre" label="Late" />
        <Legend className="bg-red-500" label="Absent" />
        <Legend className="bg-ink/30" label="Excused" />
        <Legend className="border border-ink/40" label="Scheduled" />
      </div>
    </div>
  );
}

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const student = useApi(() => api.get(`/students/${id}`), [id]);
  const enrolled = useApi(() => api.get(`/students/${id}/batches`), [id]);
  const allBatches = useApi(() => api.get("/batches"));
  const invoices = useApi(() => api.get(`/fees/invoices?student_id=${id}`), [id]);
  const calendar = useApi(() => api.get(`/students/${id}/attendance-calendar`), [id]);
  const [batchId, setBatchId] = useState("");

  const balance = (invoices.data || []).reduce((s, i) => s + Number(i.balance), 0);

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
    <Page title={s.name}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card md:col-span-2">
          <h2 className="mb-2 font-semibold">Guardian</h2>
          <p className="text-sm text-ink/70">{s.guardian_name || "—"}</p>
          <p className="text-sm text-ink/70">{s.guardian_phone || "—"}</p>
          <p className="text-sm text-ink/70">{s.guardian_email || "—"}</p>
        </div>
        <div className="card">
          <div className="text-sm text-ink/60">Outstanding balance</div>
          <div className="mt-1 text-2xl font-semibold">{inr(balance)}</div>
        </div>
      </div>

      <h2 className="mb-2 mt-6 font-semibold">Batches</h2>
      <div className="card mb-3 flex flex-wrap items-center gap-2">
        <select className="input max-w-xs" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
          <option value="">Enroll in batch…</option>
          {(allBatches.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button className="btn" onClick={enroll}>Enroll</button>
      </div>
      <Table
        columns={["Batch", "Days", ""]}
        rows={enrolled.data || []}
        empty="Not enrolled in any batch."
        render={(b) => (
          <>
            <td className="td font-medium">{b.name}</td>
            <td className="td">{b.weekly_days || "—"}</td>
            <td className="td text-right"><button className="text-red-700 hover:underline" onClick={() => unenroll(b.id)}>Unenroll</button></td>
          </>
        )}
      />

      <h2 className="mb-2 mt-6 font-semibold">Attendance</h2>
      {calendar.data ? <AttendanceCalendar items={calendar.data} /> : <div className="card text-sm text-muted">Loading…</div>}

      <h2 className="mb-2 mt-6 font-semibold">Invoices</h2>
      <Table
        columns={["Due", "Paid", "Balance", "Status", ""]}
        rows={invoices.data || []}
        empty="No invoices."
        onRowClick={(i) => navigate(`/fees/invoices/${i.id}`)}
        render={(i) => (
          <>
            <td className="td">{inr(i.amount_due)}</td>
            <td className="td">{inr(i.amount_paid)}</td>
            <td className="td">{inr(i.balance)}</td>
            <td className="td capitalize">{i.status}</td>
            <td className="td text-right text-terracotta">Open →</td>
          </>
        )}
      />
    </Page>
  );
}
