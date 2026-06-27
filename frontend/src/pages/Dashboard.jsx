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

function RecentPayments() {
  const payments = useApi(() => api.get("/payments"));
  const rows = (payments.data || []).slice(0, 5);
  return (
    <Panel title="Recent payments" link="/payments">
      {rows.length ? (
        <ul className="divide-y divide-ink/5 text-sm">
          {rows.map((p) => (
            <li key={p.id} className="flex justify-between py-2">
              <span className="capitalize text-muted">{p.method}</span>
              <span className="font-medium">{inr(p.amount)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">No payments yet.</p>}
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

function OutstandingFees({ students }) {
  const invoices = useApi(() => api.get("/fees/invoices?unpaid=true"));
  const nameOf = (sid) => (students || []).find((s) => s.id === sid)?.name || `#${sid}`;
  const today = todayISO();
  const rows = invoices.data || [];
  const total = rows.reduce((sum, i) => sum + Number(i.balance), 0);
  const top = [...rows].sort((a, b) => b.balance - a.balance).slice(0, 5);
  return (
    <Panel title="Outstanding fees" link="/fees">
      {rows.length ? (
        <>
          <div className="mb-2 text-sm text-muted">{rows.length} unpaid · <span className="font-medium text-ink">{inr(total)}</span> owed</div>
          <ul className="divide-y divide-ink/5 text-sm">
            {top.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-2">
                <Link className="hover:underline" to={`/fees/invoices/${i.id}`}>
                  {nameOf(i.student_id)}
                  {i.due_date && i.due_date < today && <span className="ml-2 rounded-full bg-terracotta/15 px-1.5 text-xs text-clay">overdue</span>}
                </Link>
                <span className="font-medium">{inr(i.balance)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : <p className="text-sm text-muted">All paid up.</p>}
    </Panel>
  );
}

function CollectionProgress({ fees }) {
  if (!fees) return <Panel title="Fee collection"><p className="text-sm text-muted">…</p></Panel>;
  const invoiced = Number(fees.invoiced) || 0;
  const collected = Number(fees.collected_on_invoices) || 0;
  const pct = invoiced ? Math.round((collected / invoiced) * 100) : 0;
  return (
    <Panel title="Fee collection">
      <div className="mb-2 text-sm text-muted">{inr(collected)} of {inr(invoiced)} invoiced <span className="font-medium text-ink">({pct}%)</span></div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-sage" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
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
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">Your fees</h2>
            <div className="flex gap-2">
              <Link className="btn" to="/my-sessions">My Sessions</Link>
              <Link className="btn-ghost" to="/my-fees">My Fees</Link>
            </div>
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
  const fees = useApi(() => api.get("/reports/fee-collection"));

  return (
    <Page title="Dashboard">
      <Animate>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Students" value={students.data?.length ?? "…"} accent="bg-terracotta" />
          <Stat label="Batches" value={batches.data?.length ?? "…"} accent="bg-sage" />
          <Stat label="Collected" value={fees.data ? inr(fees.data.payments_total) : "…"} accent="bg-ochre" />
          <Stat label="Outstanding" value={fees.data ? inr(fees.data.outstanding) : "…"} accent="bg-clay" />
        </div>
      </Animate>
      <Animate delay={60} className="mt-6 grid gap-4 lg:grid-cols-2">
        <TodaysClasses batches={batches.data} />
        <AttendanceSnapshot />
        <OutstandingFees students={students.data} />
        <CollectionProgress fees={fees.data} />
        <UpcomingSessions />
        <RecentPayments />
      </Animate>
    </Page>
  );
}
