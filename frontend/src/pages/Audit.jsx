import { api } from "../api";
import { Page, Table, useApi } from "../ui";

const VERB = { POST: "Created", PUT: "Updated", DELETE: "Deleted", PATCH: "Updated" };
const ENTITY = {
  students: "student", batches: "batch", tutors: "tutor", sessions: "session",
  payments: "payment", users: "user",
};

// Turn method + path into a readable action; fall back to the raw path.
function actionLabel(method, path) {
  const seg = path.split("/").filter(Boolean);
  const base = seg[0] || "";
  if (base === "attendance") return "Marked attendance";
  if (base === "sessions" && path.includes("/generate")) return "Generated sessions";
  if (base === "students" && path.endsWith("/enroll")) return "Enrolled student";
  if (base === "students" && path.endsWith("/unenroll")) return "Unenrolled student";
  if (base === "users" && path.endsWith("/disable")) return "Disabled user";
  if (base === "users" && path.endsWith("/enable")) return "Enabled user";
  if (base === "users" && path.endsWith("/password")) return "Changed password";
  if (base === "tutors" && path.endsWith("/deactivate")) return "Deactivated tutor";
  const e = ENTITY[base];
  return e ? `${VERB[method] || method} ${e}` : `${method} /${seg.join("/")}`;
}

export default function Audit() {
  const log = useApi(() => api.get("/audit"));
  const settings = useApi(() => api.get("/settings"));
  const enabled = settings.data?.audit_enabled ?? true;

  async function toggle() {
    await api.put("/settings", { audit_enabled: !enabled });
    settings.reload();
  }

  return (
    <Page
      title="Audit log"
      actions={
        <button
          onClick={toggle}
          disabled={!settings.data}
          role="switch"
          aria-checked={enabled}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${enabled ? "bg-sage/20 text-ink" : "bg-ink/10 text-muted"}`}
        >
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${enabled ? "bg-sage" : "bg-ink/30"}`} />
          Auditing {enabled ? "on" : "off"}
        </button>
      }
    >
      {!enabled && (
        <div className="mb-4 rounded bg-ochre/15 px-3 py-2 text-sm text-clay">
          Auditing is off — new actions are not being recorded.
        </div>
      )}
      <Table
        columns={[
          { label: "When", sort: (r) => r.created_at },
          { label: "Who", sort: (r) => r.user_email },
          { label: "Action", sort: (r) => r.path },
          { label: "Status", sort: (r) => r.status_code },
        ]}
        rows={log.data || []}
        empty="No activity recorded yet."
        render={(r) => (
          <>
            <td className="td whitespace-nowrap">{r.created_at?.slice(0, 19).replace("T", " ")}</td>
            <td className="td">{r.user_email}</td>
            <td className="td">
              <div className="text-ink">{actionLabel(r.method, r.path)}</div>
              <div className="text-xs text-muted">{r.method} {r.path}</div>
            </td>
            <td className={`td ${r.status_code >= 400 ? "text-red-700" : "text-muted"}`}>{r.status_code}</td>
          </>
        )}
      />
    </Page>
  );
}
