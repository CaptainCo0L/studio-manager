import { useState } from "react";
import { api } from "../api";
import { Page, Table, useApi } from "../ui";

export default function Users() {
  const list = useApi(() => api.get("/users"));
  const students = useApi(() => api.get("/students"));
  const tutors = useApi(() => api.get("/tutors"));
  const [form, setForm] = useState(null);

  async function create(e) {
    e.preventDefault();
    await api.post("/users", {
      email: form.email,
      password: form.password,
      role: form.role,
      student_ids: form.role === "parent" ? form.student_ids.map(Number) : [],
      tutor_id: form.role === "tutor" && form.tutor_id ? Number(form.tutor_id) : null,
    });
    setForm(null);
    list.reload();
  }

  async function toggle(u) {
    await api.post(`/users/${u.id}/${u.is_active ? "disable" : "enable"}`);
    list.reload();
  }

  return (
    <Page title="Users" actions={<button className="btn" onClick={() => setForm({ role: "staff", student_ids: [] })}>+ New user</button>}>
      {form && (
        <form onSubmit={create} className="card mb-4 grid gap-3 md:grid-cols-2">
          <input className="input" type="email" placeholder="Email" required value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" type="password" placeholder="Password" required value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="parent">Parent</option>
            <option value="tutor">Tutor</option>
          </select>
          {form.role === "parent" && (
            <select multiple className="input h-32" value={form.student_ids} onChange={(e) => setForm({ ...form, student_ids: [...e.target.selectedOptions].map((o) => o.value) })}>
              {(students.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {form.role === "tutor" && (
            <select className="input" value={form.tutor_id || ""} onChange={(e) => setForm({ ...form, tutor_id: e.target.value })}>
              <option value="">Link to tutor…</option>
              {(tutors.data || []).filter((t) => !t.linked_user_id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <div className="flex gap-2 md:col-span-2">
            <button className="btn">Save</button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <Table
        columns={[
          { label: "Email", sort: (u) => u.email },
          { label: "Role", sort: (u) => u.role },
          { label: "Status", sort: (u) => u.is_active },
          "",
        ]}
        rows={list.data || []}
        render={(u) => (
          <>
            <td className="td font-medium">{u.email}</td>
            <td className="td capitalize">{u.role}</td>
            <td className="td">{u.is_active ? "Active" : "Disabled"}</td>
            <td className="td text-right"><button className="btn-ghost" onClick={() => toggle(u)}>{u.is_active ? "Disable" : "Enable"}</button></td>
          </>
        )}
      />
    </Page>
  );
}
