# Sessions Page: Prev / Current / Next Cards + List — Design

**Date:** 2026-06-27
**Scope:** Front the Sessions page with three large cards (previous / today / next session) above the existing list. Pure frontend (`Sessions.jsx`), no backend change.

## Decisions (from brainstorming)
- **Strict today:** Previous = most recent past, Current = a session dated today (empty "No session today" card if none), Next = soonest upcoming.
- Cards **and** list derive from the currently **filtered** session set.

## Implementation (`frontend/src/pages/Sessions.jsx`)

Keep the filters card, create form, and the `Table` (with its sort/filter). Add a 3-card row between the form and the list, and feed the list the non-featured sessions.

### Bucketing (list is fetched date-desc)
```js
const rows = list.data || [];
const today = localISO(new Date());                       // YYYY-MM-DD, local
const previous = rows.find((s) => s.date < today) || null;   // first past = most recent
const current  = rows.find((s) => s.date === today) || null; // first today
const future   = rows.filter((s) => s.date > today);
const next     = future.length ? future[future.length - 1] : null; // desc ⇒ last = soonest
const featured = new Set([previous, current, next].filter(Boolean).map((s) => s.id));
const others   = rows.filter((s) => !featured.has(s.id));
```
- `localISO(d)` = `${y}-${mm}-${dd}` from local getters (not UTC, to avoid midnight drift).
- Buckets are mutually exclusive (`<`, `===`, `>`), so no session appears twice.

### Helpers
- `batchName(id)` from `/batches`, `tutorName(id)` from `/tutors` (both already fetched).
- `fmtDate(iso)` → `new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday:"short", day:"numeric", month:"short", year:"numeric" })`.

### `SessionCard({ label, badge, emptyText, session })`
- Empty (no session): a plain `card` with the label badge and centered muted `emptyText`.
- Filled: wrapped in `<Link to={`/sessions/${session.id}`}>` around a `Card hover`, showing:
  - label badge — Previous `bg-ink/10 text-muted`, Today `bg-terracotta/15 text-clay`, Next `bg-sage/20 text-ink`.
  - `fmtDate(session.date)` (display font), then muted lines: type (+ ` · batchName` for batch sessions), time (`start–end` or "Time not set"), tutor (`tutorName` or "No tutor").
- Row: `grid gap-4 md:grid-cols-3` with Previous / Today / Next; empties read "No previous session" / "No session today" / "No upcoming session".

### List below
- Heading `All sessions`.
- The existing `<Table>` fed `rows={others}`, `empty="No other sessions."`, columns unchanged (Date, Type, Batch, ""). Improve the Batch cell to show `batchName(s.batch_id)` instead of `#id` (sort stays `s.batch_id`). Keep the per-row "Open" link.

## Verification
- `npm run build`. Manual (seeded data, today = 2026-06-27): Previous/Today/Next cards populate correctly, "No session today" shows when nothing is dated today, filtering by a batch updates the trio, clicking a card opens its session, the list shows the remaining sessions and still sorts/filters.

## Non-goals
- No backend change, no new endpoint, no "in-progress by time" logic (first session today is fine), no new deps.

## Files
- `frontend/src/pages/Sessions.jsx`.
