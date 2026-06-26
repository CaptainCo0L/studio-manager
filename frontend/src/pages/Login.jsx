import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 overflow-hidden rounded-xl border border-ink/10 bg-paper p-6 shadow-sm">
        <div className="pigment-band -mx-6 -mt-6 mb-1" aria-hidden="true">
          <span className="bg-terracotta" />
          <span className="bg-ochre" />
          <span className="bg-sage" />
          <span className="bg-clay" />
        </div>
        <div className="space-y-2">
          <span className="flex gap-0.5" aria-hidden="true">
            <span className="h-5 w-2.5 rounded-sm bg-terracotta" />
            <span className="h-5 w-2.5 rounded-sm bg-sage" />
            <span className="h-5 w-2.5 rounded-sm bg-ochre" />
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-clay">Studio Manager</h1>
          <p className="text-sm text-muted">Sign in to continue</p>
        </div>
        {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
