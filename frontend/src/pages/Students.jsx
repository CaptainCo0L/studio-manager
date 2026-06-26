import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Page, Table, useApi } from "../ui";

export default function Students() {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null);
  const list = useApi(() => api.get(`/students?search=${encodeURIComponent(search)}`), [search]);

  async function create(e) {
    e.preventDefault();
    await api.post("/students", form);
    setForm(null);
    list.reload();
  }

  return (
    <Page
      title="Students"
      actions={<button className="btn" onClick={() => setForm({ name: "" })}>+ New student</button>}
    >
      <input className="input mb-4 max-w-xs" placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {form && (
        <form onSubmit={create} className="card mb-4 grid gap-3 md:grid-cols-2">
          <input className="input" placeholder="Student name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Guardian name" value={form.guardian_name || ""} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} />
          <input className="input" placeholder="Guardian phone" value={form.guardian_phone || ""} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} />
          <input className="input" type="email" placeholder="Guardian email" value={form.guardian_email || ""} onChange={(e) => setForm({ ...form, guardian_email: e.target.value })} />
          <div className="flex gap-2 md:col-span-2">
            <button className="btn">Save</button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      {list.error && <div className="mb-3 text-sm text-red-700">{list.error}</div>}
      <Table
        columns={["Name", "Guardian", "Phone", ""]}
        rows={list.data || []}
        render={(s) => (
          <>
            <td className="td font-medium">{s.name}</td>
            <td className="td">{s.guardian_name || "—"}</td>
            <td className="td">{s.guardian_phone || "—"}</td>
            <td className="td text-right"><Link className="text-terracotta hover:underline" to={`/students/${s.id}`}>Open</Link></td>
          </>
        )}
      />
    </Page>
  );
}
