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
        <UpcomingSessions />
        <RecentPayments />
      </Animate>
    </Page>
  );
}
