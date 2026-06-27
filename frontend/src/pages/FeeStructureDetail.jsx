import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Page, Table, Card, inr, useApi } from "../ui";

export default function FeeStructureDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fs = useApi(() => api.get(`/fees/structures/${id}`), [id]);
  const invoices = useApi(() => api.get(`/fees/invoices?fee_structure_id=${id}`), [id]);
  const batches = useApi(() => api.get("/batches"));
  const students = useApi(() => api.get("/students"));

  const nameOf = (sid) => (students.data || []).find((s) => s.id === sid)?.name || `#${sid}`;
  const batchName = (bid) => (batches.data || []).find((b) => b.id === bid)?.name || `#${bid}`;

  if (fs.error) return <div className="card text-sm text-red-700">{fs.error}</div>;
  if (!fs.data) return <Page title="Fee template"><div className="card text-sm text-muted">Loading…</div></Page>;

  const f = fs.data;
  return (
    <Page title={f.name} actions={<Link to="/fees" className="btn-ghost">← Fees</Link>}>
      <Card className="mb-6 grid max-w-xl gap-2 text-sm">
        <div className="flex justify-between"><span className="text-muted">Batch</span><span className="font-medium">{batchName(f.batch_id)}</span></div>
        <div className="flex justify-between"><span className="text-muted">Amount</span><span className="font-medium">{inr(f.amount)}</span></div>
        <div className="flex justify-between"><span className="text-muted">Period</span><span className="capitalize">{f.period}</span></div>
      </Card>

      <h2 className="mb-2 font-display text-lg font-semibold text-ink">Invoices from this template</h2>
      <Table
        columns={["Student", "Due", "Paid", "Balance", "Status"]}
        rows={invoices.data || []}
        empty="No invoices generated from this template."
        onRowClick={(i) => navigate(`/fees/invoices/${i.id}`)}
        render={(i) => (
          <>
            <td className="td font-medium">{nameOf(i.student_id)}</td>
            <td className="td">{inr(i.amount_due)}</td>
            <td className="td">{inr(i.amount_paid)}</td>
            <td className="td">{inr(i.balance)}</td>
            <td className="td capitalize">{i.status}</td>
          </>
        )}
      />
    </Page>
  );
}
