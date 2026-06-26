import { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { Page, Table, inr, useApi } from "../ui";

export default function StudentDetail() {
  const { id } = useParams();
  const student = useApi(() => api.get(`/students/${id}`), [id]);
  const enrolled = useApi(() => api.get(`/students/${id}/batches`), [id]);
  const allBatches = useApi(() => api.get("/batches"));
  const invoices = useApi(() => api.get(`/fees/invoices?student_id=${id}`), [id]);
  const attendance = useApi(() => api.get(`/attendance?student_id=${id}`), [id]);
  const [batchId, setBatchId] = useState("");

  const balance = (invoices.data || []).reduce((s, i) => s + Number(i.balance), 0);

  async function enroll() {
    if (!batchId) return;
    await api.post("/students/enroll", { student_id: Number(id), batch_id: Number(batchId) });
    setBatchId("");
    enrolled.reload();
  }
  async function unenroll(bid) {
    await api.post("/students/unenroll", { student_id: Number(id), batch_id: bid });
    enrolled.reload();
  }

  if (!student.data) return <Page title="Student">{student.error || "Loading…"}</Page>;
  const s = student.data;

  return (
    <Page title={s.name}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card md:col-span-2">
          <h2 className="mb-2 font-semibold">Guardian</h2>
          <p className="text-sm text-ink/70">{s.guardian_name || "—"}</p>
          <p className="text-sm text-ink/70">{s.guardian_phone || "—"}</p>
          <p className="text-sm text-ink/70">{s.guardian_email || "—"}</p>
        </div>
        <div className="card">
          <div className="text-sm text-ink/60">Outstanding balance</div>
          <div className="mt-1 text-2xl font-semibold">{inr(balance)}</div>
        </div>
      </div>

      <h2 className="mb-2 mt-6 font-semibold">Batches</h2>
      <div className="card mb-3 flex flex-wrap items-center gap-2">
        <select className="input max-w-xs" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
          <option value="">Enroll in batch…</option>
          {(allBatches.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button className="btn" onClick={enroll}>Enroll</button>
      </div>
      <Table
        columns={["Batch", "Days", ""]}
        rows={enrolled.data || []}
        empty="Not enrolled in any batch."
        render={(b) => (
          <>
            <td className="td font-medium">{b.name}</td>
            <td className="td">{b.weekly_days || "—"}</td>
            <td className="td text-right"><button className="text-red-700 hover:underline" onClick={() => unenroll(b.id)}>Unenroll</button></td>
          </>
        )}
      />

      <h2 className="mb-2 mt-6 font-semibold">Attendance history</h2>
      <Table
        columns={["Session #", "Status"]}
        rows={attendance.data || []}
        empty="No attendance recorded."
        render={(a) => (
          <>
            <td className="td">#{a.session_id}</td>
            <td className="td capitalize">{a.status}</td>
          </>
        )}
      />

      <h2 className="mb-2 mt-6 font-semibold">Invoices</h2>
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
    </Page>
  );
}
