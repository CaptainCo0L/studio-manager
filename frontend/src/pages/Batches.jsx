import { useState } from "react";
import { api } from "../api";
import { Page, Card, EmptyState, Stagger, inr, useApi } from "../ui";
import { useToast } from "../components/Toast";

function BatchCard({ batch, allStudents, onEdit, onChanged }) {
  // Roster comes from the /batches list response (no per-card fetch); onChanged
  // reloads the list, which refreshes this batch's students.
  const roster = batch.students || [];
  const toast = useToast();

  async function add(e) {
    const sid = Number(e.target.value);
    if (!sid) return;
    try {
      await api.post("/students/enroll", { student_id: sid, batch_id: batch.id });
      toast.success("Student added.");
      onChanged();
    } catch (err) {
      toast.error(err.message);
    }
  }
  async function remove(sid) {
    try {
      await api.post("/students/unenroll", { student_id: sid, batch_id: batch.id });
      toast.success("Student removed.");
      onChanged();
    } catch (err) {
      toast.error(err.message);
    }
  }
  async function del() {
    if (!confirm(`Delete batch "${batch.name}"?`)) return;
    try {
      await api.del(`/batches/${batch.id}`);
      toast.success("Batch deleted.");
      onChanged();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const enrolledIds = new Set(roster.map((s) => s.id));
  const available = (allStudents || []).filter((s) => !enrolledIds.has(s.id));

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-lg font-semibold text-ink">{batch.name}</div>
          <div className="text-sm text-muted">
            {batch.classes_per_week}× per week
            {batch.monthly_fee != null && ` · ${inr(batch.monthly_fee)}/mo`}
          </div>
        </div>
        <div className="flex gap-2 text-sm">
          <button className="text-terracotta hover:underline" onClick={() => onEdit(batch)}>Edit</button>
          <button className="text-red-700 hover:underline" onClick={del}>Delete</button>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Students ({roster.length})</div>
        {roster.length ? (
          <ul className="space-y-1">
            {roster.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span>{s.name}</span>
                <button className="text-xs text-red-700 hover:underline" onClick={() => remove(s.id)}>Remove</button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-muted">No students linked.</div>
        )}
        <select className="input mt-2 text-sm" value="" onChange={add} disabled={!available.length}>
          <option value="">{available.length ? "+ Add student…" : "All students linked"}</option>
          {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
    </Card>
  );
}

export default function Batches() {
  const list = useApi(() => api.get("/batches"));
  const students = useApi(() => api.get("/students"));
  const [form, setForm] = useState(null); // { id?, name, classes_per_week, monthly_fee }
  const blank = { name: "", classes_per_week: 1, monthly_fee: "" };

  async function save(e) {
    e.preventDefault();
    const body = {
      name: form.name,
      classes_per_week: Number(form.classes_per_week) || 1,
      monthly_fee: form.monthly_fee === "" ? null : Number(form.monthly_fee),
    };
    if (form.id) await api.put(`/batches/${form.id}`, body);
    else await api.post("/batches", body);
    setForm(null);
    list.reload();
  }

  return (
    <Page title="Batches" actions={<button className="btn" onClick={() => setForm(blank)}>+ New batch</button>}>
      {form && (
        <form onSubmit={save} className="card mb-4 grid gap-3 md:grid-cols-2">
          <input className="input" placeholder="Batch name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label className="text-sm">Classes per week
            <input className="input mt-1" type="number" min="1" required value={form.classes_per_week} onChange={(e) => setForm({ ...form, classes_per_week: e.target.value })} />
          </label>
          <label className="text-sm">Monthly fee (₹) — optional
            <input className="input mt-1" type="number" min="0" step="any" placeholder="e.g. 800" value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })} />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button className="btn">{form.id ? "Update" : "Save"}</button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      {(list.data || []).length ? (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(list.data || []).map((b) => (
            <BatchCard
              key={b.id}
              batch={b}
              allStudents={students.data || []}
              onEdit={(batch) => setForm({ id: batch.id, name: batch.name, classes_per_week: batch.classes_per_week, monthly_fee: batch.monthly_fee ?? "" })}
              onChanged={() => list.reload()}
            />
          ))}
        </Stagger>
      ) : (
        <EmptyState
          title="No batches yet"
          hint="Create a batch to group students and mark their attendance."
          action={<button className="btn" onClick={() => setForm(blank)}>+ New batch</button>}
        />
      )}
    </Page>
  );
}
