import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Page } from "../ui";
import { useToast } from "../components/Toast";

export default function Account() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState(user.email);
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });

  async function saveEmail(e) {
    e.preventDefault();
    try {
      await api.put("/users/me", { email });
      await refreshUser();
      toast.success("Email updated.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    if (pw.new_password !== pw.confirm) {
      toast.error("New passwords don't match.");
      return;
    }
    try {
      await api.post("/users/me/password", { current_password: pw.current_password, new_password: pw.new_password });
      setPw({ current_password: "", new_password: "", confirm: "" });
      toast.success("Password changed.");
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <Page title="My account">
      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <form onSubmit={saveEmail} className="card space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">Email</h2>
          <p className="text-xs text-muted">Signed in as <span className="capitalize">{user.role}</span>.</p>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="flex items-center gap-3">
            <button className="btn">Save email</button>
          </div>
        </form>

        <form onSubmit={savePassword} className="card space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">Change password</h2>
          <input className="input" type="password" placeholder="Current password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
          <input className="input" type="password" placeholder="New password (min 6)" required minLength={6} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
          <input className="input" type="password" placeholder="Confirm new password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          <div className="flex items-center gap-3">
            <button className="btn">Change password</button>
          </div>
        </form>
      </div>
    </Page>
  );
}
