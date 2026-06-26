import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
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

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV.filter((n) => n.roles.includes(user.role));
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <span className="text-lg font-bold text-terracotta">Studio Manager</span>
          <nav className="flex flex-wrap gap-1 text-sm">
            {items.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `rounded px-2 py-1 ${isActive ? "bg-terracotta text-white" : "text-ink/70 hover:bg-ink/5"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-ink/60">{user.email}</span>
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
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
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
