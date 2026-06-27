import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { inr, useApi } from "../ui";

const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");
const invNo = (id) => `INV-${String(id).padStart(4, "0")}`;

const STATUS_STYLE = {
  paid: "bg-sage/20 text-sage",
  partial: "bg-ochre/20 text-clay",
  unpaid: "bg-terracotta/15 text-clay",
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const inv = useApi(() => api.get(`/fees/invoices/${id}`), [id]);
  const studio = useApi(() => api.get("/settings"));

  if (inv.error) return <div className="card text-sm text-red-700">{inv.error}</div>;
  if (!inv.data || !studio.data) return <div className="card text-sm text-muted">Loading…</div>;

  const i = inv.data;
  const s = studio.data;
  const desc = (i.fee_name || "Tuition fee") + (i.fee_period ? ` (${i.fee_period})` : "");

  return (
    <div className="mx-auto max-w-3xl">
      {/* Action bar — hidden when printing */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link to="/fees" className="text-sm text-terracotta hover:underline">← Back to Fees</Link>
        <button className="btn" onClick={() => window.print()}>Download PDF</button>
      </div>

      {/* Invoice sheet */}
      <div className="invoice-sheet rounded-xl border border-ink/10 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="font-display text-2xl font-semibold text-ink">{s.studio_name || "Studio Manager"}</div>
            <div className="mt-1 whitespace-pre-line text-sm text-muted">
              {[s.address, s.phone, s.email].filter(Boolean).join("\n") || "—"}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-semibold tracking-wide text-clay">INVOICE</div>
            <div className="mt-1 text-sm text-muted">{invNo(i.id)}</div>
            <div className="mt-2 text-sm"><span className="text-muted">Issued:</span> {fmtDate(i.created_at)}</div>
            <div className="text-sm"><span className="text-muted">Due:</span> {fmtDate(i.due_date)}</div>
          </div>
        </div>

        <div className="my-6 border-t border-ink/10" />

        <div className="text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Bill to</div>
          <div className="font-medium text-ink">{i.student_name}</div>
          {i.guardian_name && <div className="text-muted">c/o {i.guardian_name}</div>}
          {i.guardian_phone && <div className="text-muted">{i.guardian_phone}</div>}
          {i.guardian_email && <div className="text-muted">{i.guardian_email}</div>}
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-ink/5">
              <td className="py-3 text-ink">{desc}</td>
              <td className="py-3 text-right text-ink">{inr(i.amount_due)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted">Amount due</span><span>{inr(i.amount_due)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Paid</span><span>{inr(i.amount_paid)}</span></div>
            <div className="flex justify-between border-t border-ink/15 pt-1 font-semibold text-ink"><span>Balance</span><span>{inr(i.balance)}</span></div>
            <div className="flex justify-between pt-1">
              <span className="text-muted">Status</span>
              <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLE[i.status] || "bg-ink/10 text-ink"}`}>{i.status}</span>
            </div>
          </div>
        </div>

        {i.payments.length > 0 && (
          <div className="mt-8">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Payments received</div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-ink/5">
                {i.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 text-muted">{fmtDate(p.created_at)}</td>
                    <td className="py-1.5 capitalize text-muted">{p.method}</td>
                    <td className="py-1.5 text-right text-ink">{inr(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-10 text-center text-xs text-muted">Thank you.</div>
      </div>
    </div>
  );
}
