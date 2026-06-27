import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Page, Table, inr, useApi } from "../ui";

export default function Fees() {
  const navigate = useNavigate();
  const structures = useApi(() => api.get("/fees/structures"));
  const invoices = useApi(() => api.get("/fees/invoices"));
  const batches = useApi(() => api.get("/batches"));
  const students = useApi(() => api.get("/students"));
  const [sForm, setSForm] = useState(null);
  const [iForm, setIForm] = useState(null);

  async function createStructure(e) {
    e.preventDefault();
    await api.post("/fees/structures", {
      batch_id: Number(sForm.batch_id),
      name: sForm.name,
      amount: Number(sForm.amount),
      period: sForm.period || "monthly",
      auto_invoice: !!sForm.auto_invoice,
    });
    setSForm(null);
    structures.reload();
    invoices.reload();
  }

  async function createInvoice(e) {
    e.preventDefault();
    await api.post("/fees/invoices", {
      student_id: Number(iForm.student_id),
      amount_due: Number(iForm.amount_due),
      due_date: iForm.due_date || null,
    });
    setIForm(null);
    invoices.reload();
  }

  const nameOf = (sid) => (students.data || []).find((s) => s.id === sid)?.name || `#${sid}`;

  return (
    <Page title="Fees">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Fee templates</h2>
        <button className="btn" onClick={() => setSForm({ name: "", period: "monthly" })}>+ Template</button>
      </div>
      {sForm && (
        <form onSubmit={createStructure} className="card mb-4 grid gap-3 md:grid-cols-2">
          <select className="input" required value={sForm.batch_id || ""} onChange={(e) => setSForm({ ...sForm, batch_id: e.target.value })}>
            <option value="">Select batch…</option>
            {(batches.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input className="input" placeholder="Name (e.g. Monthly fee)" required value={sForm.name} onChange={(e) => setSForm({ ...sForm, name: e.target.value })} />
          <input className="input" type="number" step="0.01" placeholder="Amount" required value={sForm.amount || ""} onChange={(e) => setSForm({ ...sForm, amount: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!sForm.auto_invoice} onChange={(e) => setSForm({ ...sForm, auto_invoice: e.target.checked })} /> Auto-invoice all enrolled students</label>
          <div className="flex gap-2 md:col-span-2">
            <button className="btn">Save</button>
            <button type="button" className="btn-ghost" onClick={() => setSForm(null)}>Cancel</button>
          </div>
        </form>
      )}
      <Table
        columns={["Name", "Batch", "Amount", "Period", ""]}
        rows={structures.data || []}
        empty="No fee templates."
        onRowClick={(f) => navigate(`/fees/structures/${f.id}`)}
        render={(f) => (
          <>
            <td className="td font-medium">{f.name}</td>
            <td className="td">#{f.batch_id}</td>
            <td className="td">{inr(f.amount)}</td>
            <td className="td">{f.period}</td>
            <td className="td text-right text-terracotta">Open →</td>
          </>
        )}
      />

      <div className="mb-2 mt-6 flex items-center justify-between">
        <h2 className="font-semibold">Invoices</h2>
        <button className="btn" onClick={() => setIForm({})}>+ Invoice</button>
      </div>
      {iForm && (
        <form onSubmit={createInvoice} className="card mb-4 grid gap-3 md:grid-cols-3">
          <select className="input" required value={iForm.student_id || ""} onChange={(e) => setIForm({ ...iForm, student_id: e.target.value })}>
            <option value="">Select student…</option>
            {(students.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="input" type="number" step="0.01" placeholder="Amount due" required value={iForm.amount_due || ""} onChange={(e) => setIForm({ ...iForm, amount_due: e.target.value })} />
          <input className="input" type="date" value={iForm.due_date || ""} onChange={(e) => setIForm({ ...iForm, due_date: e.target.value })} />
          <div className="flex gap-2 md:col-span-3">
            <button className="btn">Save</button>
            <button type="button" className="btn-ghost" onClick={() => setIForm(null)}>Cancel</button>
          </div>
        </form>
      )}
      <Table
        columns={["Student", "Due", "Paid", "Balance", "Status", ""]}
        rows={invoices.data || []}
        empty="No invoices."
        onRowClick={(i) => navigate(`/fees/invoices/${i.id}`)}
        render={(i) => (
          <>
            <td className="td font-medium">{nameOf(i.student_id)}</td>
            <td className="td">{inr(i.amount_due)}</td>
            <td className="td">{inr(i.amount_paid)}</td>
            <td className="td">{inr(i.balance)}</td>
            <td className="td capitalize">{i.status}</td>
            <td className="td text-right text-terracotta">Open →</td>
          </>
        )}
      />
    </Page>
  );
}
