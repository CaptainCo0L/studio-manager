import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { inr, useApi } from "../ui";

const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");
const invNo = (id) => `INV-${String(id).padStart(4, "0")}`;

export default function PaymentInvoice() {
  const { id } = useParams();
  const pay = useApi(() => api.get(`/payments/${id}`), [id]);
  const studio = useApi(() => api.get("/settings"));

  if (pay.error) return <div className="card text-sm text-red-700">{pay.error}</div>;
  if (!pay.data || !studio.data) return <div className="card text-sm text-muted">Loading…</div>;

  const p = pay.data;
  const s = studio.data;
  const desc = `Payment received (${p.method})` + (p.note ? ` — ${p.note}` : "");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link to="/payments" className="text-sm text-terracotta hover:underline">← Back to Payments</Link>
        <button className="btn" onClick={() => window.print()}>Download PDF</button>
      </div>

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
            <div className="mt-1 text-sm text-muted">{invNo(p.id)}</div>
            <div className="mt-2 text-sm"><span className="text-muted">Date:</span> {fmtDate(p.created_at)}</div>
          </div>
        </div>

        <div className="my-6 border-t border-ink/10" />

        {p.student_name && (
          <div className="text-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Bill to</div>
            <div className="font-medium text-ink">{p.student_name}</div>
            {p.guardian_name && <div className="text-muted">c/o {p.guardian_name}</div>}
            {p.guardian_phone && <div className="text-muted">{p.guardian_phone}</div>}
            {p.guardian_email && <div className="text-muted">{p.guardian_email}</div>}
          </div>
        )}

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
              <td className="py-3 text-right text-ink">{inr(p.amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between border-t border-ink/15 pt-1 font-semibold text-ink"><span>Total paid</span><span>{inr(p.amount)}</span></div>
            <div className="flex justify-between pt-1">
              <span className="text-muted">Status</span>
              <span className="rounded-full bg-sage/20 px-2 py-0.5 text-xs text-sage">Paid</span>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-muted">Thank you.</div>
      </div>
    </div>
  );
}
