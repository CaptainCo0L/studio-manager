import { Link, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import Batches from "./pages/Batches";
import Tutors from "./pages/Tutors";
import Sessions from "./pages/Sessions";
import SessionDetail from "./pages/SessionDetail";
import Fees from "./pages/Fees";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import MySessions from "./pages/MySessions";
import MyFees from "./pages/MyFees";

// Nav entries with the roles allowed to see them.
const NAV = [
  { to: "/", label: "Dashboard", roles: ["admin", "staff", "parent"] },
  { to: "/students", label: "Students", roles: ["admin", "staff"] },
  { to: "/batches", label: "Batches", roles: ["admin", "staff"] },
  { to: "/tutors", label: "Tutors", roles: ["admin", "staff"] },
  { to: "/sessions", label: "Sessions", roles: ["admin", "staff"] },
  { to: "/fees", label: "Fees", roles: ["admin", "staff"] },
  { to: "/payments", label: "Payments", roles: ["admin", "staff"] },
  { to: "/reports", label: "Reports", roles: ["admin", "staff"] },
  { to: "/users", label: "Users", roles: ["admin"] },
  { to: "/my-sessions", label: "My Sessions", roles: ["parent"] },
  { to: "/my-fees", label: "My Fees", roles: ["parent"] },
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
  const items = NAV.filter((n) => n.roles.includes(user.role));
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <Pigment />
            <span className="font-display text-xl font-semibold tracking-tight text-clay">Studio Manager</span>
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `rounded-md px-2.5 py-1 font-medium transition-colors ${isActive ? "bg-terracotta text-paper" : "text-muted hover:bg-ink/5 hover:text-ink"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{user.email}</span>
            <button
              className="btn-ghost"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </div>
        </div>
        <div className="pigment-band" aria-hidden="true">
          <span className="bg-terracotta" />
          <span className="bg-ochre" />
          <span className="bg-sage" />
          <span className="bg-clay" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
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
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Guard><Dashboard /></Guard>} />
      <Route path="/students" element={<Guard roles={staff}><Students /></Guard>} />
      <Route path="/students/:id" element={<Guard roles={staff}><StudentDetail /></Guard>} />
      <Route path="/batches" element={<Guard roles={staff}><Batches /></Guard>} />
      <Route path="/tutors" element={<Guard roles={staff}><Tutors /></Guard>} />
      <Route path="/sessions" element={<Guard roles={staff}><Sessions /></Guard>} />
      <Route path="/sessions/:id" element={<Guard roles={staff}><SessionDetail /></Guard>} />
      <Route path="/fees" element={<Guard roles={staff}><Fees /></Guard>} />
      <Route path="/payments" element={<Guard roles={staff}><Payments /></Guard>} />
      <Route path="/reports" element={<Guard roles={staff}><Reports /></Guard>} />
      <Route path="/users" element={<Guard roles={["admin"]}><Users /></Guard>} />
      <Route path="/my-sessions" element={<Guard roles={["parent"]}><MySessions /></Guard>} />
      <Route path="/my-fees" element={<Guard roles={["parent"]}><MyFees /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
