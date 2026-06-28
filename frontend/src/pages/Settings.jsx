import { useEffect, useState } from "react";
import { api } from "../api";
import { Page, Loading, useApi } from "../ui";
import { useToast } from "../components/Toast";

export default function Settings() {
  const toast = useToast();
  const settings = useApi(() => api.get("/settings"));
  const [form, setForm] = useState(null);

  // Seed the form once settings load.
  useEffect(() => {
    if (settings.data && !form) {
      const { studio_name, address, phone, email } = settings.data;
      setForm({ studio_name: studio_name || "", address: address || "", phone: phone || "", email: email || "" });
    }
  }, [settings.data, form]);

  async function save(e) {
    e.preventDefault();
    try {
      await api.put("/settings", form);
      toast.success("Studio details saved.");
      settings.reload();
    } catch (err) {
      toast.error(err.message || "Couldn't save.");
    }
  }

  if (!form) return <Page title="Studio details"><Loading /></Page>;

  const field = (key, label, type = "text") => (
    <label className="text-sm">
      {label}
      <input className="input mt-1" type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </label>
  );

  return (
    <Page title="Studio details">
      <form onSubmit={save} className="card grid max-w-2xl gap-4 md:grid-cols-2">
        <p className="text-sm text-muted md:col-span-2">These details appear as the issuer on printed payment invoices.</p>
        {field("studio_name", "Studio name")}
        {field("phone", "Phone")}
        {field("email", "Email", "email")}
        {field("address", "Address")}
        <div className="flex items-center gap-3 md:col-span-2">
          <button className="btn">Save</button>
        </div>
      </form>
    </Page>
  );
}
