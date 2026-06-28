import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Page, Card, Table, EmptyState, inr, fmtMonth, useApi } from "../ui";

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function Dues() {
  const [month, setMonth] = useState(thisMonth);
  const dues = useApi(() => api.get(`/reports/dues?month=${month}`), [month]);
  const data = dues.data || { rows: [], count: 0, total_outstanding: 0 };
  // Dues rows have no DB id; key on the student+batch pair.
  const rows = data.rows.map((r) => ({ ...r, id: `${r.student_id}-${r.batch_id}` }));

  return (
    <Page
      title="Dues"
      actions={
        <input
          className="input"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label="Month"
        />
      }
    >
      <Card className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="text-sm text-muted">Outstanding for {fmtMonth(month)}</div>
          <div className="font-display text-3xl font-semibold text-ink">{inr(data.total_outstanding)}</div>
        </div>
        <div className="text-sm text-muted">{data.count} {data.count === 1 ? "student" : "students"}</div>
      </Card>

      {dues.error ? (
        <div className="card text-sm text-red-700">Could not load dues: {dues.error}</div>
      ) : rows.length ? (
        <Table
          columns={[
            { label: "Student", sort: (r) => r.student_name },
            { label: "Batch", sort: (r) => r.batch_name },
            { label: "Phone" },
            { label: "Fee", align: "right", sort: (r) => r.fee },
            { label: "Paid", align: "right", sort: (r) => r.paid },
            { label: "Outstanding", align: "right", sort: (r) => r.outstanding },
            { label: "" },
          ]}
          rows={rows}
          render={(r) => (
            <>
              <td className="td font-medium text-ink">{r.student_name}</td>
              <td className="td text-muted">{r.batch_name}</td>
              <td className="td text-muted">{r.guardian_phone || "—"}</td>
              <td className="td text-right">{inr(r.fee)}</td>
              <td className="td text-right text-muted">{inr(r.paid)}</td>
              <td className="td text-right font-semibold text-clay">{inr(r.outstanding)}</td>
              <td className="td text-right">
                <Link className="text-sm text-terracotta hover:underline" to="/payments">Record payment</Link>
              </td>
            </>
          )}
        />
      ) : (
        <EmptyState
          title="All settled"
          hint={`No outstanding fees for ${fmtMonth(month)}. Set a monthly fee on a batch to track its dues.`}
        />
      )}
    </Page>
  );
}
