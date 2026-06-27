import { useState } from "react";
import { api } from "../api";
import { Page, EntityCard, Stagger, inr, useApi } from "../ui";

export default function Tutors() {
  const list = useApi(() => api.get("/tutors"));
  const [form, setForm] = useState(null);

  async function create(e) {
    e.preventDefault();
    await api.post("/tutors", {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      is_guest: !!form.is_guest,
      default_rate: form.default_rate ? Number(form.default_rate) : null,
    });
    setForm(null);
    list.reload();
  }

  async function deactivate(t) {
    await api.post(`/tutors/${t.id}/deactivate`);
    list.reload();
  }

  return (
    <Page title="Tutors" actions={<button className="btn" onClick={() => setForm({ name: "" })}>+ New tutor</button>}>
      {form && (
        <form onSubmit={create} className="card mb-4 grid gap-3 md:grid-cols-2">
          <input className="input" placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input" placeholder="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" type="number" step="0.01" placeholder="Default rate (₹/session)" value={form.default_rate || ""} onChange={(e) => setForm({ ...form, default_rate: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.is_guest} onChange={(e) => setForm({ ...form, is_guest: e.target.checked })} /> Guest tutor (no login)</label>
          <div className="flex gap-2 md:col-span-2">
            <button className="btn">Save</button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      {(list.data || []).length ? (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(list.data || []).map((t) => (
            <EntityCard
              key={t.id}
              initial={(t.name || "?").charAt(0).toUpperCase()}
              title={t.name}
              badge={t.is_guest ? <span className="shrink-0 rounded-full bg-ochre/20 px-2 py-0.5 text-xs text-clay">Guest</span> : null}
              lines={[
                t.phone || t.email || "No contact",
                t.default_rate ? `Rate ${inr(t.default_rate)}` : "No default rate",
                t.is_active ? "Active" : "Inactive",
              ]}
              footer={t.is_active && <button className="text-sm text-red-700 hover:underline" onClick={() => deactivate(t)}>Deactivate</button>}
            />
          ))}
        </Stagger>
      ) : (
        <div className="card text-sm text-muted">No tutors yet.</div>
      )}
    </Page>
  );
}
