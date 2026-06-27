# Studio Manager — User Manual

A guide for using the app day to day. For installation/deployment see the main
[README](../README.md).

---

## 1. Signing in

1. Open the app (e.g. `http://localhost:8080`, or your studio's address).
2. Enter your **email** and **password** and click **Sign in**.
3. You stay signed in on this device until you click **Logout** (top right).

**First-ever login** uses the admin account created at install
(`admin@example.com` by default). Change its password after first use.

Forgot your password? There's no self-service reset — ask an **admin** to
disable and recreate your account, or set a new one.

---

## 2. Who can do what (roles)

| Area | Admin | Staff | Parent |
|------|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ (own view) |
| Students, Batches, Tutors, Sessions | ✅ | ✅ | — |
| Attendance, Payments, Reports | ✅ | ✅ | — |
| Users (accounts), Audit | ✅ | — | — |
| My Sessions | — | — | ✅ |

Parents see **only their own linked children's** data, and only for reading.

---

## 3. Dashboard

The landing page after login.

- **Staff/Admin:** counts of students, batches, tutors, and sessions, plus
  today's classes, an attendance snapshot, batch enrollment, and recent payments.
- **Parent:** a shortcut to *My Sessions*.

---

## 4. Students

**Students → list.** Search by name at the top.

**Add a student:** click **+ New student**, fill name (required) and optional
guardian name / phone / email, then **Save**. The guardian email is used to
auto-send payment receipts, so add it if you have it.

**Open a student** (the *Open* link) to see their detail page:

- **Batches** — enroll the student into a batch (pick from the dropdown →
  **Enroll**) or **Unenroll** from one.
- **Attendance** — a month calendar of their scheduled and attended sessions.

---

## 5. Batches (recurring weekly groups)

**Batches → + New batch:**

1. Name the batch (e.g. "Saturday Morning").
2. Click the **weekday buttons** for the days it meets (e.g. Sat).
3. Optionally set **start/end time** and a **default tutor**.
4. **Save.**

The list shows each batch's meeting days, time, and current student count.

**Generate sessions:** click **Generate sessions** on a batch, enter how many
weeks ahead, and the app creates one class session per matching weekday (it
skips dates that already have a session). Enrolled students are auto-added to
each session's attendance roster.

---

## 6. Tutors

A teaching directory, **separate from login accounts**.

**+ New tutor:** name, optional contact, optional **default rate** (₹ per
private session, used for payout estimates). Tick **Guest tutor** for someone
who teaches occasionally and has no account.

**Deactivate** hides a tutor from active lists without deleting their history.

---

## 7. Sessions & attendance

A **session** is one class occurrence. Three types:

- **batch** — a scheduled group class (usually created via *Generate sessions*).
- **private** — a one-on-one lesson, billed per session.
- **dropin** — an ad-hoc single visit.

**+ New session:** pick the type and date.
- For **batch**, choose the batch.
- For **private/dropin**, choose the student and a rate; that student is
  automatically marked **present**.

**Open a session** to:

- **Mark the roster** — for batch sessions the enrolled students are listed
  (defaulting to *present*). Tap **present / absent** for each (or use
  **Mark all present / absent**), then **Save attendance**.
- **Record payment** (private/drop-in only) — enter amount and method to log a
  payment tied directly to that lesson.

**Filtering:** the Sessions list filters by batch and date range.

---

## 8. Payments

**Payments → + Record payment:**

- Enter **amount** and **method** (cash / card / UPI / bank transfer / other).
- Optionally tag a **student** and add a **note**.

If the student has a guardian email on file, a **receipt is emailed
automatically** (only when email/SMTP is configured — see README).

Private-lesson payments are usually recorded from the **session** page instead
(section 7).

---

## 9. Reports

The **Reports** page shows:

- **Attendance summary** — totals by status.
- **Tutor sessions** — per tutor: session counts, private lessons, private
  earnings, and estimated payout (private sessions × default rate).

---

## 10. Users (admin only)

**Users → + New user:**

- **Email** + **password**.
- **Role:** Admin (full), Staff (everything but user accounts), or **Parent**.
- For a **Parent**, select which student(s) the account may see (hold
  Ctrl/Cmd to pick several). The parent will then see only those children.

**Enable / Disable** turns an account's access on or off without deleting it.

---

## 11. The parent portal

Parents have a simplified, read-only view:

- **My Sessions** — upcoming and past sessions for their child(ren).

Parents cannot see other families' data or change anything.

---

## 12. Notifications

- **Email** receipts are sent on payment when SMTP is configured and the
  guardian email is on file.
- **SMS (Twilio)** and **WhatsApp** send only when their credentials are
  configured; otherwise they're quietly skipped (logged as *disabled*).

---

## Quick reference

| I want to… | Go to |
|---|---|
| Add a child | Students → + New student |
| Put a child in a class | Student detail → Batches → Enroll |
| Set up a weekly class | Batches → + New batch |
| Create this month's classes | Batches → Generate sessions |
| Take attendance | Sessions → open a session → mark roster |
| Record a payment | Payments → + Record payment |
| Bill a private lesson | Sessions → open → Record payment |
| Give a parent access | Users → + New user → Parent |
