import { useEffect, useState } from "react";
import { api } from "../api";
import { Page, useApi } from "../ui";

export default function Settings() {
  const settings = useApi(() => api.get("/settings"));
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  // Seed the form once settings load.
  useEffect(() => {
    if (settings.data && !form) {
      const { studio_name, address, phone, email } = settings.data;
      setForm({ studio_name: studio_name || "", address: address || "", phone: phone || "", email: email || "" });
    }
  }, [settings.data, form]);

  async function save(e) {
    e.preventDefault();
    await api.put("/settings", form);
    setSaved(true);
    settings.reload();
  }

  if (!form) return <Page title="Studio details"><div className="card text-sm text-muted">Loading…</div></Page>;

  const field = (key, label, type = "text") => (
    <label className="text-sm">
      {label}
      <input className="input mt-1" type={type} value={form[key]} onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setSaved(false); }} />
    </label>
  );

  return (
    <Page title="Studio details">
      <form onSubmit={save} className="card grid max-w-2xl gap-4 md:grid-cols-2">
        <p className="text-sm text-muted md:col-span-2">These details appear as the issuer on printed invoices.</p>
        {field("studio_name", "Studio name")}
        {field("phone", "Phone")}
        {field("email", "Email", "email")}
        {field("address", "Address")}
        <div className="flex items-center gap-3 md:col-span-2">
          <button className="btn">Save</button>
          {saved && <span className="text-sm text-sage">Saved.</span>}
        </div>
      </form>
    </Page>
  );
}
