import { api } from "../api";
import { Page, Table, useApi } from "../ui";

// Parent view: backend already scopes /sessions to the parent's linked children.
export default function MySessions() {
  const list = useApi(() => api.get("/sessions"));
  return (
    <Page title="My Sessions">
      <Table
        columns={["Date", "Type", "Time"]}
        rows={list.data || []}
        empty="No sessions yet."
        render={(s) => (
          <>
            <td className="td">{s.date}</td>
            <td className="td capitalize">{s.session_type}</td>
            <td className="td">{s.start_time ? `${s.start_time}–${s.end_time || ""}` : "—"}</td>
          </>
        )}
      />
    </Page>
  );
}
