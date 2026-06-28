import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { Page, useApi } from "../ui";

// Tutor view of one of their sessions (read-only). Attendance is marked on the
// dedicated Attendance page.
export default function TutorSessionDetail() {
  const { id } = useParams();
  const session = useApi(() => api.get(`/sessions/${id}`), [id]);

  if (!session.data) return <Page title="Session">{session.error || "Loading…"}</Page>;
  const s = session.data;

  return (
    <Page title={`Session ${s.date}`}>
      <div className="card text-sm text-ink/70">
        <span className="capitalize">{s.session_type}</span>
        {s.start_time && <> · {s.start_time}–{s.end_time || ""}</>}
      </div>
      <p className="mt-3 text-sm text-muted">
        Mark attendance on the <Link className="text-terracotta hover:underline" to="/attendance">Attendance page</Link>.
      </p>
    </Page>
  );
}
