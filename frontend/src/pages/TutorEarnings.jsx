import { api } from "../api";
import { Page, Card, Loading, inr, useApi } from "../ui";

export default function TutorEarnings() {
  const e = useApi(() => api.get("/reports/my-earnings"));
  if (!e.data) return <Page title="My Earnings">{e.error ? <div className="card text-sm text-red-600">{e.error}</div> : <Loading />}</Page>;
  const d = e.data;
  const row = (label, value) => (
    <div className="flex justify-between border-b border-ink/5 py-2 text-sm last:border-0">
      <span className="text-muted">{label}</span><span className="font-medium">{value}</span>
    </div>
  );
  return (
    <Page title="My Earnings">
      <Card className="max-w-md">
        {row("Total sessions", d.session_count)}
        {row("Private lessons", d.private_sessions)}
        {row("Private earnings", inr(d.private_earnings))}
        {row("Estimated payout", inr(d.estimated_payout))}
      </Card>
    </Page>
  );
}
