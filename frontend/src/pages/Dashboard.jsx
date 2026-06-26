import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Page, inr, useApi } from "../ui";

function Stat({ label, value }) {
  return (
    <div className="card">
      <div className="text-sm text-ink/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
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
        <Stat label="Students" value={students.data?.length ?? "…"} />
        <Stat label="Batches" value={batches.data?.length ?? "…"} />
        <Stat label="Collected" value={fees.data ? inr(fees.data.payments_total) : "…"} />
        <Stat label="Outstanding" value={fees.data ? inr(fees.data.outstanding) : "…"} />
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
