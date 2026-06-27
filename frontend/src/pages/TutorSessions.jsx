import { Link } from "react-router-dom";
import { api } from "../api";
import { Page, Table, useApi } from "../ui";

// Backend scopes /sessions to the logged-in tutor's own sessions.
export default function TutorSessions() {
  const list = useApi(() => api.get("/sessions"));
  return (
    <Page title="My Sessions">
      <Table
        columns={[
          { label: "Date", sort: (s) => s.date },
          { label: "Type", sort: (s) => s.session_type },
          { label: "Time", sort: (s) => s.start_time || "" },
          "",
        ]}
        rows={list.data || []}
        empty="No sessions assigned to you."
        render={(s) => (
          <>
            <td className="td">{s.date}</td>
            <td className="td capitalize">{s.session_type}</td>
            <td className="td">{s.start_time ? `${s.start_time}–${s.end_time || ""}` : "—"}</td>
            <td className="td text-right"><Link className="text-terracotta hover:underline" to={`/tutor/sessions/${s.id}`}>Open</Link></td>
          </>
        )}
      />
    </Page>
  );
}
