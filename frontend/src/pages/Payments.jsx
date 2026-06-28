import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Page, Table, inr, fmtMonth, PAYMENT_METHODS, useApi } from "../ui";
import { useToast } from "../components/Toast";

export default function Payments() {
  const navigate = useNavigate();
  const toast = useToast();
  const list = useApi(() => api.get("/payments"));
  const students = useApi(() => api.get("/students"));
  const [form, setForm] = useState(null);
  // Batch options are the selected student's enrolled batches.
  const studentBatches = useApi(
    () => (form?.student_id ? api.get(`/students/${form.student_id}/batches`) : Promise.resolve([])),
    [form?.student_id]
  );

  async function save(e) {
    e.preventDefault();
    const body = {
      amount: Number(form.amount),
      method: form.method,
      student_id: Number(form.student_id),
      batch_id: Number(form.batch_id),
      period_month: form.period_month,
      note: form.note || null,
    };
    try {
      if (form.id) {
        await api.put(`/payments/${form.id}`, body);
        setForm(null);
        list.reload();
        toast.success("Payment updated.");
      } else {
        const payment = await api.post("/payments", body);
        setForm(null);
        list.reload();
        toast.success("Payment recorded.");
        navigate(`/payments/${payment.id}`); // open the auto-created invoice
      }
    } catch (err) {
      toast.error(err.message || "Couldn't save payment.");
    }
  }

  return (
    <Page title="Payments" actions={<button className="btn" onClick={() => setForm({ method: "cash" })}>+ Record payment</button>}>
      {form && (
        <form onSubmit={save} className="card mb-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">Student
            <select className="input mt-1" required value={form.student_id || ""} onChange={(e) => setForm({ ...form, student_id: e.target.value, batch_id: "" })}>
              <option value="">Select student…</option>
              {(students.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Batch
            <select className="input mt-1" required disabled={!form.student_id} value={form.batch_id || ""} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}>
              <option value="">{form.student_id ? "Select batch…" : "Pick a student first"}</option>
              {(studentBatches.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Month
            <input className="input mt-1" type="month" required value={form.period_month || ""} onChange={(e) => setForm({ ...form, period_month: e.target.value })} />
          </label>
          <label className="text-sm">Amount (₹)
            <input className="input mt-1" type="number" step="0.01" required value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label className="text-sm">Method
            <select className="input mt-1" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <input className="input self-end" placeholder="Note (optional)" value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="flex gap-2 md:col-span-2">
            <button className="btn">{form.id ? "Update" : "Save"}</button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <Table
        columns={[
          { label: "#", sort: (p) => p.id },
          { label: "Student", sort: (p) => p.student_name || "" },
          { label: "Batch", sort: (p) => p.batch_name || "" },
          { label: "Month", sort: (p) => p.period_month || "" },
          { label: "Amount", sort: (p) => Number(p.amount) },
          { label: "Method", sort: (p) => p.method },
          { label: "When", sort: (p) => p.created_at },
          "",
        ]}
        rows={list.data || []}
        onRowClick={(p) => navigate(`/payments/${p.id}`)}
        render={(p) => (
          <>
            <td className="td">{p.id}</td>
            <td className="td">{p.student_name || "—"}</td>
            <td className="td">{p.batch_name || (p.session_id ? `session #${p.session_id}` : "—")}</td>
            <td className="td">{p.period_month ? fmtMonth(p.period_month) : "—"}</td>
            <td className="td font-medium">{inr(p.amount)}</td>
            <td className="td">{p.method}</td>
            <td className="td">{p.created_at?.slice(0, 10)}</td>
            <td className="td text-right">
              {p.batch_id && (
                <button
                  className="mr-3 text-terracotta hover:underline"
                  onClick={(e) => { e.stopPropagation(); setForm({ id: p.id, student_id: String(p.student_id), batch_id: String(p.batch_id), period_month: p.period_month, amount: p.amount, method: p.method, note: p.note }); }}
                >
                  Edit
                </button>
              )}
              <span className="text-terracotta">Invoice →</span>
            </td>
          </>
        )}
      />
    </Page>
  );
}
