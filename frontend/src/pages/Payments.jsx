import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Page, Table, inr, useApi } from "../ui";

export const fmtMonth = (m) => {
  if (!m) return "—";
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1).toLocaleString(undefined, { month: "long", year: "numeric" });
};

export default function Payments() {
  const navigate = useNavigate();
  const list = useApi(() => api.get("/payments"));
  const students = useApi(() => api.get("/students"));
  const batches = useApi(() => api.get("/batches"));
  const [form, setForm] = useState(null);
  // Batch options are the selected student's enrolled batches.
  const studentBatches = useApi(
    () => (form?.student_id ? api.get(`/students/${form.student_id}/batches`) : Promise.resolve([])),
    [form?.student_id]
  );

  async function create(e) {
    e.preventDefault();
    const payment = await api.post("/payments", {
      amount: Number(form.amount),
      method: form.method,
      student_id: Number(form.student_id),
      batch_id: Number(form.batch_id),
      period_month: form.period_month,
      note: form.note || null,
    });
    setForm(null);
    list.reload();
    navigate(`/payments/${payment.id}`); // open the auto-created invoice
  }

  const nameOf = (sid) => (students.data || []).find((s) => s.id === sid)?.name || (sid ? `#${sid}` : "—");
  const batchOf = (bid) => (batches.data || []).find((b) => b.id === bid)?.name || (bid ? `#${bid}` : "—");

  return (
    <Page title="Payments" actions={<button className="btn" onClick={() => setForm({ method: "cash" })}>+ Record payment</button>}>
      {form && (
        <form onSubmit={create} className="card mb-4 grid gap-3 md:grid-cols-2">
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
              {["cash", "card", "upi", "bank_transfer", "other"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <input className="input self-end" placeholder="Note (optional)" value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="flex gap-2 md:col-span-2">
            <button className="btn">Save</button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <Table
        columns={[
          { label: "#", sort: (p) => p.id },
          { label: "Student", sort: (p) => nameOf(p.student_id) },
          { label: "Batch", sort: (p) => (p.batch_id ? batchOf(p.batch_id) : "") },
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
            <td className="td">{nameOf(p.student_id)}</td>
            <td className="td">{p.batch_id ? batchOf(p.batch_id) : p.session_id ? `session #${p.session_id}` : "—"}</td>
            <td className="td">{p.period_month ? fmtMonth(p.period_month) : "—"}</td>
            <td className="td font-medium">{inr(p.amount)}</td>
            <td className="td">{p.method}</td>
            <td className="td">{p.created_at?.slice(0, 10)}</td>
            <td className="td text-right text-terracotta">Invoice →</td>
          </>
        )}
      />
    </Page>
  );
}
