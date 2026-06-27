import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Page, Table, inr, useApi } from "../ui";

export default function Payments() {
  const navigate = useNavigate();
  const list = useApi(() => api.get("/payments"));
  const students = useApi(() => api.get("/students"));
  const [form, setForm] = useState(null);

  async function create(e) {
    e.preventDefault();
    const payment = await api.post("/payments", {
      amount: Number(form.amount),
      method: form.method,
      student_id: form.student_id ? Number(form.student_id) : null,
      note: form.note || null,
    });
    setForm(null);
    list.reload();
    navigate(`/payments/${payment.id}`); // open the auto-created invoice
  }

  const nameOf = (sid) => (students.data || []).find((s) => s.id === sid)?.name || (sid ? `#${sid}` : "—");

  return (
    <Page title="Payments" actions={<button className="btn" onClick={() => setForm({ method: "cash" })}>+ Record payment</button>}>
      {form && (
        <form onSubmit={create} className="card mb-4 grid gap-3 md:grid-cols-2">
          <input className="input" type="number" step="0.01" placeholder="Amount" required value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            {["cash", "card", "upi", "bank_transfer", "other"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="input" value={form.student_id || ""} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
            <option value="">Student (optional)…</option>
            {(students.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="input md:col-span-2" placeholder="Note" value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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
