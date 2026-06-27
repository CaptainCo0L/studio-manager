import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Page } from "../ui";

export default function Account() {
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState(user.email);
  const [emailMsg, setEmailMsg] = useState(null);
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);

  async function saveEmail(e) {
    e.preventDefault();
    setEmailMsg(null);
    try {
      await api.put("/users/me", { email });
      await refreshUser();
      setEmailMsg({ ok: true, text: "Saved." });
    } catch (err) {
      setEmailMsg({ ok: false, text: err.message });
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.new_password !== pw.confirm) {
      setPwMsg({ ok: false, text: "New passwords don't match." });
      return;
    }
    try {
      await api.post("/users/me/password", { current_password: pw.current_password, new_password: pw.new_password });
      setPw({ current_password: "", new_password: "", confirm: "" });
      setPwMsg({ ok: true, text: "Password changed." });
    } catch (err) {
      setPwMsg({ ok: false, text: err.message });
    }
  }

  const note = (m) => m && <span className={`text-sm ${m.ok ? "text-sage" : "text-red-700"}`}>{m.text}</span>;

  return (
    <Page title="My account">
      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <form onSubmit={saveEmail} className="card space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">Email</h2>
          <p className="text-xs text-muted">Signed in as <span className="capitalize">{user.role}</span>.</p>
          <input className="input" type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setEmailMsg(null); }} />
          <div className="flex items-center gap-3">
            <button className="btn">Save email</button>
            {note(emailMsg)}
          </div>
        </form>

        <form onSubmit={savePassword} className="card space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">Change password</h2>
          <input className="input" type="password" placeholder="Current password" required value={pw.current_password} onChange={(e) => { setPw({ ...pw, current_password: e.target.value }); setPwMsg(null); }} />
          <input className="input" type="password" placeholder="New password (min 6)" required minLength={6} value={pw.new_password} onChange={(e) => { setPw({ ...pw, new_password: e.target.value }); setPwMsg(null); }} />
          <input className="input" type="password" placeholder="Confirm new password" required value={pw.confirm} onChange={(e) => { setPw({ ...pw, confirm: e.target.value }); setPwMsg(null); }} />
          <div className="flex items-center gap-3">
            <button className="btn">Change password</button>
            {note(pwMsg)}
          </div>
        </form>
      </div>
    </Page>
  );
}
