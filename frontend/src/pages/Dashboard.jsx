import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Page, Card, Animate, inr, useApi } from "../ui";

function Stat({ label, value, accent }) {
  return (
    <div className="card relative overflow-hidden">
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" />
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold text-ink">{value}</div>
    </div>
  );
}

const todayISO = () => new Date().toISOString().slice(0, 10);

function Panel({ title, link, children }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {link && <Link className="text-sm text-terracotta hover:underline" to={link}>View all</Link>}
      </div>
      {children}
    </Card>
  );
}

function UpcomingSessions() {
  const sessions = useApi(() => api.get(`/sessions?date_from=${todayISO()}`));
  const rows = (sessions.data || []).slice(0, 5);
  return (
    <Panel title="Upcoming sessions" link="/sessions">
      {rows.length ? (
        <ul className="divide-y divide-ink/5 text-sm">
          {rows.map((s) => (
            <li key={s.id} className="flex justify-between py-2">
              <Link className="hover:underline" to={`/sessions/${s.id}`}>{s.date}</Link>
              <span className="capitalize text-muted">{s.session_type}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">No upcoming sessions.</p>}
    </Panel>
  );
}

function RecentPayments({ students }) {
  const payments = useApi(() => api.get("/payments"));
  const nameOf = (sid) => (students || []).find((s) => s.id === sid)?.name || (sid ? `#${sid}` : "—");
  const rows = (payments.data || []).slice(0, 5);
  return (
    <Panel title="Recent payments" link="/payments">
      {rows.length ? (
        <ul className="divide-y divide-ink/5 text-sm">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-ink">{nameOf(p.student_id)}</div>
                <div className="text-xs capitalize text-muted">{p.method} · {p.created_at?.slice(0, 10)}</div>
              </div>
              <span className="font-medium">{inr(p.amount)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">No payments yet.</p>}
    </Panel>
  );
}

function BatchEnrollment({ batches }) {
  const rows = [...(batches || [])].sort((a, b) => a.student_count - b.student_count);
  return (
    <Panel title="Batch enrollment" link="/batches">
      {rows.length ? (
        <ul className="divide-y divide-ink/5 text-sm">
          {rows.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-2">
              <Link className="hover:underline" to="/batches">{b.name}</Link>
              <span className="flex items-center gap-2">
                {b.student_count === 0 && <span className="rounded-full bg-terracotta/15 px-1.5 text-xs text-clay">empty</span>}
                <span className="font-medium">{b.student_count} {b.student_count === 1 ? "student" : "students"}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">No batches yet.</p>}
    </Panel>
  );
}

function TodaysClasses({ batches }) {
  const today = todayISO();
  const sessions = useApi(() => api.get(`/sessions?date_from=${today}&date_to=${today}`));
  const nameOf = (bid) => (batches || []).find((b) => b.id === bid)?.name;
  const rows = sessions.data || [];
  return (
    <Panel title="Today's classes" link="/sessions">
      {rows.length ? (
        <ul className="divide-y divide-ink/5 text-sm">
          {rows.map((s) => (
            <li key={s.id} className="py-2">
              <Link className="hover:underline" to={`/sessions/${s.id}`}>
                {s.start_time ? s.start_time.slice(0, 5) : "—"} · <span className="capitalize">{s.session_type}</span>
                {s.batch_id && nameOf(s.batch_id) ? ` · ${nameOf(s.batch_id)}` : ""}
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">No classes today.</p>}
    </Panel>
  );
}

function AttendanceSnapshot() {
  const att = useApi(() => api.get("/reports/attendance-summary"));
  const d = att.data || {};
  const present = d.present || 0;
  const absent = d.absent || 0;
  const total = present + absent;
  return (
    <Panel title="Attendance snapshot">
      {total ? (
        <div>
          <div className="font-display text-3xl font-semibold text-ink">{Math.round((present / total) * 100)}%</div>
          <div className="text-sm text-muted">attendance rate</div>
          <div className="mt-2 text-sm text-muted">Present {present} · Absent {absent}</div>
        </div>
      ) : <p className="text-sm text-muted">No attendance recorded yet.</p>}
    </Panel>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  if (user.role === "parent") {
    return (
      <Page title="Welcome">
        <Animate className="grid gap-4 lg:grid-cols-2">
          <UpcomingSessions />
          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">Your children's classes</h2>
            <p className="mb-3 text-sm text-muted">View upcoming sessions and attendance.</p>
            <Link className="btn" to="/my-sessions">My Sessions</Link>
          </Card>
        </Animate>
      </Page>
    );
  }

  if (user.role === "tutor") {
    return (
      <Page title="Welcome">
        <Animate className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">Your sessions</h2>
            <p className="mb-3 text-sm text-muted">View your scheduled sessions and mark attendance.</p>
            <Link className="btn" to="/tutor/sessions">My Sessions</Link>
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">Your earnings</h2>
            <p className="mb-3 text-sm text-muted">Session counts and estimated payout.</p>
            <Link className="btn-ghost" to="/tutor/earnings">My Earnings</Link>
          </Card>
        </Animate>
      </Page>
    );
  }

  return <StaffDashboard />;
}

function StaffDashboard() {
  const students = useApi(() => api.get("/students"));
  const batches = useApi(() => api.get("/batches"));
  const tutors = useApi(() => api.get("/tutors"));
  const sessions = useApi(() => api.get("/sessions"));

  return (
    <Page title="Dashboard">
      <Animate>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Students" value={students.data?.length ?? "…"} accent="bg-terracotta" />
          <Stat label="Batches" value={batches.data?.length ?? "…"} accent="bg-sage" />
          <Stat label="Tutors" value={tutors.data?.length ?? "…"} accent="bg-ochre" />
          <Stat label="Sessions" value={sessions.data?.length ?? "…"} accent="bg-clay" />
        </div>
      </Animate>
      <Animate delay={60} className="mt-6 grid gap-4 lg:grid-cols-2">
        <TodaysClasses batches={batches.data} />
        <AttendanceSnapshot />
        <BatchEnrollment batches={batches.data} />
        <RecentPayments students={students.data} />
      </Animate>
    </Page>
  );
}
