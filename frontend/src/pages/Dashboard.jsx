import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Page, inr, useApi } from "../ui";

function Stat({ label, value, accent }) {
  return (
    <div className="card relative overflow-hidden">
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" />
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold text-ink">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  if (user.role === "parent") {
    return (
      <Page title={`Welcome`}>
        <div className="card space-y-2 text-sm">
          <p>Use the menu to view your children's sessions and fees.</p>
          <div className="flex gap-2">
            <Link className="btn" to="/my-sessions">My Sessions</Link>
            <Link className="btn-ghost" to="/my-fees">My Fees</Link>
          </div>
        </div>
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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Students" value={students.data?.length ?? "…"} accent="bg-terracotta" />
        <Stat label="Batches" value={batches.data?.length ?? "…"} accent="bg-sage" />
        <Stat label="Collected" value={fees.data ? inr(fees.data.payments_total) : "…"} accent="bg-ochre" />
        <Stat label="Outstanding" value={fees.data ? inr(fees.data.outstanding) : "…"} accent="bg-clay" />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link className="btn" to="/sessions">Sessions</Link>
        <Link className="btn-ghost" to="/students">Students</Link>
        <Link className="btn-ghost" to="/payments">Payments</Link>
        <Link className="btn-ghost" to="/reports">Reports</Link>
      </div>
    </Page>
  );
}
