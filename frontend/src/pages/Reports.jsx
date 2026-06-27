import { api } from "../api";
import { Page, Table, inr, useApi } from "../ui";

export default function Reports() {
  const attendance = useApi(() => api.get("/reports/attendance-summary"));
  const fees = useApi(() => api.get("/reports/fee-collection"));
  const tutors = useApi(() => api.get("/reports/tutor-sessions"));

  return (
    <Page title="Reports">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">Attendance summary</h2>
          {attendance.data && Object.keys(attendance.data).length
            ? <ul className="text-sm">{Object.entries(attendance.data).map(([k, v]) => <li key={k} className="flex justify-between"><span className="capitalize">{k}</span><span>{v}</span></li>)}</ul>
            : <p className="text-sm text-ink/60">No attendance yet.</p>}
        </div>
        <div className="card">
          <h2 className="mb-2 font-semibold">Fee collection</h2>
          {fees.data && (
            <ul className="text-sm">
              <li className="flex justify-between"><span>Invoiced</span><span>{inr(fees.data.invoiced)}</span></li>
              <li className="flex justify-between"><span>Collected (invoices)</span><span>{inr(fees.data.collected_on_invoices)}</span></li>
              <li className="flex justify-between"><span>All payments</span><span>{inr(fees.data.payments_total)}</span></li>
              <li className="flex justify-between font-semibold"><span>Outstanding</span><span>{inr(fees.data.outstanding)}</span></li>
            </ul>
          )}
        </div>
      </div>

      <h2 className="mb-2 mt-6 font-semibold">Tutor sessions</h2>
      <Table
        columns={[
          { label: "Tutor", sort: (t) => t.tutor },
          { label: "Sessions", sort: (t) => t.session_count },
          { label: "Private", sort: (t) => t.private_sessions },
          { label: "Earnings", sort: (t) => Number(t.private_earnings) },
          { label: "Est. payout", sort: (t) => Number(t.estimated_payout) },
        ]}
        rows={tutors.data || []}
        empty="No tutors."
        render={(t) => (
          <>
            <td className="td font-medium">{t.tutor}</td>
            <td className="td">{t.session_count}</td>
            <td className="td">{t.private_sessions}</td>
            <td className="td">{inr(t.private_earnings)}</td>
            <td className="td">{inr(t.estimated_payout)}</td>
          </>
        )}
      />
    </Page>
  );
}
