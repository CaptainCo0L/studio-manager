import { lazy, Suspense, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import GlobalSearch from "./components/GlobalSearch";
import ThemeToggle from "./components/ThemeToggle";
// Login + Dashboard load eagerly (login screen + landing); the rest are
// route-split so each role only downloads the pages it actually opens.
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

const Students = lazy(() => import("./pages/Students"));
const StudentDetail = lazy(() => import("./pages/StudentDetail"));
const Batches = lazy(() => import("./pages/Batches"));
const Tutors = lazy(() => import("./pages/Tutors"));
const Sessions = lazy(() => import("./pages/Sessions"));
const SessionDetail = lazy(() => import("./pages/SessionDetail"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Payments = lazy(() => import("./pages/Payments"));
const PaymentInvoice = lazy(() => import("./pages/PaymentInvoice"));
const Dues = lazy(() => import("./pages/Dues"));
const Users = lazy(() => import("./pages/Users"));
const Settings = lazy(() => import("./pages/Settings"));
const Account = lazy(() => import("./pages/Account"));
const Audit = lazy(() => import("./pages/Audit"));
const MySessions = lazy(() => import("./pages/MySessions"));
const TutorSessions = lazy(() => import("./pages/TutorSessions"));
const TutorSessionDetail = lazy(() => import("./pages/TutorSessionDetail"));
const TutorEarnings = lazy(() => import("./pages/TutorEarnings"));

// Nav entries with the roles allowed to see them.
const NAV = [
  { to: "/", label: "Dashboard", roles: ["admin", "staff", "parent", "tutor"] },
  { to: "/students", label: "Students", roles: ["admin", "staff"] },
  { to: "/batches", label: "Batches", roles: ["admin", "staff"] },
  { to: "/tutors", label: "Tutors", roles: ["admin", "staff"] },
  { to: "/sessions", label: "Sessions", roles: ["admin", "staff"] },
  { to: "/attendance", label: "Attendance", roles: ["admin", "staff", "tutor"] },
  { to: "/payments", label: "Payments", roles: ["admin", "staff"] },
  { to: "/dues", label: "Dues", roles: ["admin", "staff"] },
  { to: "/users", label: "Users", roles: ["admin"] },
  { to: "/settings", label: "Studio Details", roles: ["admin"] },
  { to: "/audit", label: "Audit", roles: ["admin"] },
  { to: "/my-sessions", label: "My Sessions", roles: ["parent"] },
  { to: "/tutor/sessions", label: "My Sessions", roles: ["tutor"] },
  { to: "/tutor/earnings", label: "My Earnings", roles: ["tutor"] },
];

// Brand mark: three pigment chips, like paint loaded on a palette.
function Pigment() {
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      <span className="h-4 w-2 rounded-sm bg-terracotta" />
      <span className="h-4 w-2 rounded-sm bg-sage" />
      <span className="h-4 w-2 rounded-sm bg-ochre" />
    </span>
  );
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => n.roles.includes(user.role));

  const nav = (
    <nav className="flex flex-col gap-0.5 text-sm">
      {items.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === "/"}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `relative rounded-lg px-3 py-2 font-medium transition-colors ${isActive ? "bg-terracotta/10 text-terracotta" : "text-muted hover:bg-ink/5 hover:text-ink"}`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-terracotta" aria-hidden="true" />}
              {n.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full w-60 flex-col border-r border-ink/10 bg-paper">
      <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-5 py-4">
        <Pigment />
        <span className="font-display text-xl font-semibold tracking-tight text-clay">Studio Manager</span>
      </Link>
      {["admin", "staff"].includes(user.role) && <GlobalSearch onNavigate={() => setOpen(false)} />}
      <div className="flex-1 overflow-y-auto px-3">{nav}</div>
      <div className="border-t border-ink/10 px-4 py-3 text-sm">
        <div className="mb-2 truncate text-muted">{user.email}</div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/account" onClick={() => setOpen(false)} className="btn-ghost px-2 py-2" title="My account" aria-label="My account">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
          <button className="btn-ghost flex-1" onClick={() => { logout(); navigate("/login"); }}>Logout</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen md:block print:hidden">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-20 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 h-full">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur md:hidden print:hidden">
          <button className="btn-ghost px-2 py-2" onClick={() => setOpen(true)} aria-label="Open menu">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-display text-lg font-semibold text-clay">Studio Manager</span>
        </header>
        <main className="mx-auto w-full max-w-screen-2xl flex-1 px-6 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}

// Guard: requires auth; optionally restricts to roles.
function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-ink/60">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

const staff = ["admin", "staff"];

export default function App() {
  return (
    <Suspense fallback={<div className="p-8 text-muted">Loading…</div>}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Guard><Dashboard /></Guard>} />
      <Route path="/students" element={<Guard roles={staff}><Students /></Guard>} />
      <Route path="/students/:id" element={<Guard roles={staff}><StudentDetail /></Guard>} />
      <Route path="/batches" element={<Guard roles={staff}><Batches /></Guard>} />
      <Route path="/tutors" element={<Guard roles={staff}><Tutors /></Guard>} />
      <Route path="/sessions" element={<Guard roles={staff}><Sessions /></Guard>} />
      <Route path="/sessions/:id" element={<Guard roles={staff}><SessionDetail /></Guard>} />
      <Route path="/attendance" element={<Guard roles={["admin", "staff", "tutor"]}><Attendance /></Guard>} />
      <Route path="/payments" element={<Guard roles={staff}><Payments /></Guard>} />
      <Route path="/payments/:id" element={<Guard roles={staff}><PaymentInvoice /></Guard>} />
      <Route path="/dues" element={<Guard roles={staff}><Dues /></Guard>} />
      <Route path="/users" element={<Guard roles={["admin"]}><Users /></Guard>} />
      <Route path="/settings" element={<Guard roles={["admin"]}><Settings /></Guard>} />
      <Route path="/audit" element={<Guard roles={["admin"]}><Audit /></Guard>} />
      <Route path="/account" element={<Guard><Account /></Guard>} />
      <Route path="/my-sessions" element={<Guard roles={["parent"]}><MySessions /></Guard>} />
      <Route path="/tutor/sessions" element={<Guard roles={["tutor"]}><TutorSessions /></Guard>} />
      <Route path="/tutor/sessions/:id" element={<Guard roles={["tutor"]}><TutorSessionDetail /></Guard>} />
      <Route path="/tutor/earnings" element={<Guard roles={["tutor"]}><TutorEarnings /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
