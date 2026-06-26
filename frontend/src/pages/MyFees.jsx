import { api } from "../api";
import { Page, Table, inr, useApi } from "../ui";

// Parent view: backend scopes invoices/payments to linked children.
export default function MyFees() {
  const invoices = useApi(() => api.get("/fees/invoices"));
  const payments = useApi(() => api.get("/payments"));
  const balance = (invoices.data || []).reduce((s, i) => s + Number(i.balance), 0);

  return (
    <Page title="My Fees">
      <div className="card mb-4">
        <div className="text-sm text-ink/60">Outstanding balance</div>
        <div className="mt-1 text-2xl font-semibold">{inr(balance)}</div>
      </div>

      <h2 className="mb-2 font-semibold">Invoices</h2>
      <Table
        columns={["Due", "Paid", "Balance", "Status"]}
        rows={invoices.data || []}
        empty="No invoices."
        render={(i) => (
          <>
            <td className="td">{inr(i.amount_due)}</td>
            <td className="td">{inr(i.amount_paid)}</td>
            <td className="td">{inr(i.balance)}</td>
            <td className="td capitalize">{i.status}</td>
          </>
        )}
      />

      <h2 className="mb-2 mt-6 font-semibold">Payments</h2>
      <Table
        columns={["Amount", "Method", "When"]}
        rows={payments.data || []}
        empty="No payments yet."
        render={(p) => (
          <>
            <td className="td font-medium">{inr(p.amount)}</td>
            <td className="td">{p.method}</td>
            <td className="td">{p.created_at?.slice(0, 10)}</td>
          </>
        )}
      />
    </Page>
  );
}
