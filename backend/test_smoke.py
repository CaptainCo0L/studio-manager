"""End-to-end smoke check. No pytest needed: `python test_smoke.py`.

Runs the whole app against a throwaway sqlite DB and asserts the core flows,
including parent data isolation (the security-critical path).

The API is served under /api (the same image also serves the SPA at the root);
only /health lives at the root.
"""
import os
import warnings

warnings.filterwarnings("ignore")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_smoke.db")
if os.path.exists("test_smoke.db"):
    os.remove("test_smoke.db")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def run():
    with TestClient(app) as c:
        assert c.get("/health").json() == {"status": "ok"}

        tok = c.post("/api/auth/login", data={"username": "admin@example.com", "password": "admin123"}).json()
        h = {"Authorization": f"Bearer {tok['access_token']}"}
        assert c.get("/api/users/me", headers=h).json()["role"] == "admin"

        bid = c.post("/api/batches", json={"name": "Sat AM", "classes_per_week": 2}, headers=h).json()["id"]
        assert c.get("/api/batches", headers=h).json()[0]["classes_per_week"] == 2
        sid = c.post("/api/students", json={"name": "Asha"}, headers=h).json()["id"]
        assert c.post("/api/students/enroll", json={"student_id": sid, "batch_id": bid}, headers=h).status_code == 201

        # Batch sessions are created manually now (no fixed-weekday generation).
        gen = [c.post("/api/sessions", json={"session_type": "batch", "date": d, "batch_id": bid}, headers=h).json()
               for d in ("2030-03-02", "2030-03-09")]
        assert len(gen) == 2 and all(s.get("id") for s in gen), gen

        # Monthly batch payment: student + batch + month required (non-session)
        assert c.post("/api/payments", json={"amount": 1000, "method": "upi", "student_id": sid}, headers=h).status_code == 400
        pid = c.post("/api/payments", json={"amount": 1000, "method": "upi", "student_id": sid, "batch_id": bid, "period_month": "2026-06"}, headers=h).json()["id"]
        assert any(p["amount"] == 1000 for p in c.get("/api/payments", headers=h).json())
        pinv = c.get(f"/api/payments/{pid}", headers=h).json()
        assert pinv["student_name"] == "Asha" and pinv["batch_name"] == "Sat AM" and pinv["period_month"] == "2026-06", pinv
        # session-tied (private) payment needs no batch/month
        assert c.post("/api/payments", json={"amount": 200, "method": "cash", "session_id": gen[0]["id"]}, headers=h).status_code == 201

        # Parent isolation
        other = c.post("/api/students", json={"name": "Hidden Kid"}, headers=h).json()
        c.post("/api/users", json={"email": "parent@example.com", "password": "parentpw", "role": "parent", "student_ids": [sid]}, headers=h)
        ptok = c.post("/api/auth/login", data={"username": "parent@example.com", "password": "parentpw"}).json()
        ph = {"Authorization": f"Bearer {ptok['access_token']}"}
        assert [s["name"] for s in c.get("/api/students", headers=ph).json()] == ["Asha"]
        assert c.get(f"/api/students/{other['id']}", headers=ph).status_code == 404
        assert c.post("/api/students", json={"name": "x"}, headers=ph).status_code == 403

        # Session-detail isolation: parent sees a session only if their child attends it
        s0, s1 = gen[0]["id"], gen[1]["id"]
        c.post(
            "/api/attendance/bulk",
            json={"session_id": s0, "items": [{"student_id": sid, "status": "present"}]},
            headers=h,
        )
        assert c.get(f"/api/sessions/{s0}", headers=ph).status_code == 200  # child attends
        assert c.get(f"/api/sessions/{s1}", headers=ph).status_code == 404  # child does not
        assert c.get(f"/api/sessions/{s1}", headers=h).status_code == 200  # staff sees all

        # Money validation: amounts must be > 0
        assert c.post("/api/payments", json={"amount": -50, "method": "cash"}, headers=h).status_code == 422
        # Input floors: empty user password, empty name, non-positive session rate all rejected
        assert c.post("/api/users", json={"email": "x@example.com", "password": "", "role": "staff"}, headers=h).status_code == 422
        assert c.post("/api/students", json={"name": ""}, headers=h).status_code == 422
        assert c.post("/api/sessions", json={"session_type": "private", "date": "2030-04-01", "rate": -5}, headers=h).status_code == 422

        # Fees stay removed; studio settings are back for the invoice header
        assert c.get("/api/fees/structures", headers=h).status_code == 404
        s = c.get("/api/settings", headers=h).json()
        assert s["id"] == 1 and "studio_name" in s, s
        assert c.put("/api/settings", json={"studio_name": "Kalanthra Art Studio"}, headers=h).json()["studio_name"] == "Kalanthra Art Studio"
        assert c.put("/api/settings", json={"studio_name": "Hacked"}, headers=ph).status_code == 403

        # Attendance calendar: scheduled vs marked status + parent isolation
        cal = c.get(f"/api/students/{sid}/attendance-calendar", headers=h).json()
        by_sess = {r["session_id"]: r["status"] for r in cal}
        assert by_sess.get(s0) == "present" and by_sess.get(s1) is None, cal
        assert c.get(f"/api/students/{other['id']}/attendance-calendar", headers=ph).status_code == 404

        # Account self-service: change password (wrong current rejected), then change email
        assert c.post("/api/users/me/password", json={"current_password": "nope", "new_password": "newpass1"}, headers=h).status_code == 400
        assert c.post("/api/users/me/password", json={"current_password": "admin123", "new_password": "newpass1"}, headers=h).json()["ok"] is True
        assert c.post("/api/auth/login", data={"username": "admin@example.com", "password": "newpass1"}).status_code == 200
        assert c.put("/api/users/me", json={"email": "boss@example.com"}, headers=h).json()["email"] == "boss@example.com"
        assert c.get("/api/users/me", headers=h).json()["email"] == "boss@example.com"  # token still valid
        assert c.put("/api/users/me", json={"email": "parent@example.com"}, headers=h).status_code == 400  # taken

        # Roster auto-seeds unmarked enrolled students as present (leaner marking)
        roster = c.get(f"/api/attendance/roster/{s1}", headers=h).json()
        assert any(r["student_id"] == sid and r["status"] == "present" for r in roster), roster

        # only present/absent are valid statuses now
        for bad in ("excused", "late"):
            assert c.post("/api/attendance/bulk", json={"session_id": s0, "items": [{"student_id": sid, "status": bad}]}, headers=h).status_code == 400

        # --- Tutor login + portal isolation ---
        tut = c.post("/api/tutors", json={"name": "Tutor One", "default_rate": 500}, headers=h).json()
        tsess = c.post("/api/sessions", json={"session_type": "batch", "date": "2030-01-05", "batch_id": bid, "tutor_id": tut["id"]}, headers=h).json()["id"]
        c.post("/api/users", json={"email": "tutor@example.com", "password": "tutorpw", "role": "tutor", "tutor_id": tut["id"]}, headers=h)
        ttok = c.post("/api/auth/login", data={"username": "tutor@example.com", "password": "tutorpw"}).json()
        th = {"Authorization": f"Bearer {ttok['access_token']}"}
        # sees only their own session
        assert [s["id"] for s in c.get("/api/sessions", headers=th).json()] == [tsess]
        assert c.get(f"/api/sessions/{tsess}", headers=th).status_code == 200
        assert c.get(f"/api/sessions/{s0}", headers=th).status_code == 404  # not their session
        # roster carries names; can mark own session, not another's
        roster_t = c.get(f"/api/attendance/roster/{tsess}", headers=th).json()
        assert any(r["student_id"] == sid and r.get("student_name") for r in roster_t), roster_t
        assert c.post("/api/attendance/bulk", json={"session_id": tsess, "items": [{"student_id": sid, "status": "absent"}]}, headers=th).status_code == 200
        assert c.post("/api/attendance/bulk", json={"session_id": s0, "items": [{"student_id": sid, "status": "absent"}]}, headers=th).status_code == 404
        # locked out of staff data
        assert c.get("/api/students", headers=th).json() == []
        assert c.get("/api/reports/my-earnings", headers=th).status_code == 200
        # a tutor can't be linked to a second login
        assert c.post("/api/users", json={"email": "dup@example.com", "password": "dup1234", "role": "tutor", "tutor_id": tut["id"]}, headers=h).status_code == 400

        # Global search: staff finds students/batches/tutors; non-staff blocked
        res = c.get("/api/search?q=Asha", headers=h).json()
        assert any(hit["label"] == "Asha" for hit in res["students"]), res
        assert any(hit["label"] == "Sat AM" for hit in c.get("/api/search?q=Sat", headers=h).json()["batches"])
        assert any(hit["label"] == "Tutor One" for hit in c.get("/api/search?q=Tutor", headers=h).json()["tutors"])
        assert c.get("/api/search?q=Asha", headers=ph).status_code == 403  # parent blocked
        assert c.get("/api/search?q=Asha", headers=th).status_code == 403  # tutor blocked

        # Audit log: mutations recorded, reads/auth not; admin-only viewer
        log = c.get("/api/audit", headers=h).json()
        assert any(r["method"] == "POST" and r["path"] == "/api/students" for r in log), "student create not audited"
        assert all(r["method"] != "GET" for r in log), "GET should not be audited"
        assert all(not r["path"].startswith("/api/auth") for r in log), "/auth should not be audited"
        assert any(r["user_email"] == "admin@example.com" for r in log)
        assert c.get("/api/audit", headers=ph).status_code == 403  # parent blocked
        assert c.get("/api/audit", headers=th).status_code == 403  # tutor blocked

        # Edit (PUT) session and payment in place
        assert c.put(f"/api/sessions/{s0}", json={"session_type": "batch", "date": "2030-03-02", "batch_id": bid, "notes": "edited"}, headers=h).json()["notes"] == "edited"
        assert c.put(f"/api/payments/{pid}", json={"amount": 1500, "method": "cash", "student_id": sid, "batch_id": bid, "period_month": "2026-07"}, headers=h).json()["amount"] == 1500.0
        assert c.put(f"/api/payments/{pid}", json={"amount": 1500, "method": "cash", "student_id": sid}, headers=h).status_code == 400  # still requires batch+month

        # Audit on/off toggle: disabling stops new rows, re-enabling resumes
        n0 = len(c.get("/api/audit", headers=h).json())
        c.put("/api/settings", json={"audit_enabled": False}, headers=h)
        c.post("/api/students", json={"name": "Untracked"}, headers=h)
        assert len(c.get("/api/audit", headers=h).json()) == n0, "audit rows added while disabled"
        c.put("/api/settings", json={"audit_enabled": True}, headers=h)
        c.post("/api/students", json={"name": "Tracked Again"}, headers=h)
        assert len(c.get("/api/audit", headers=h).json()) > n0, "audit not recording after re-enable"

        # Attendance grid (dedicated page)
        assert any(b["id"] == bid for b in c.get("/api/attendance/batches", headers=h).json())
        grid = c.get(f"/api/attendance/grid?batch_id={bid}&month=2030-03", headers=h).json()
        assert {s["id"] for s in grid["sessions"]} == {gen[0]["id"], gen[1]["id"]}, grid
        assert any(st["id"] == sid for st in grid["students"]), grid
        c.post("/api/attendance/bulk", json={"session_id": gen[1]["id"], "items": [{"student_id": sid, "status": "absent"}]}, headers=h)
        grid2 = c.get(f"/api/attendance/grid?batch_id={bid}&month=2030-03", headers=h).json()
        assert any(m["student_id"] == sid and m["session_id"] == gen[1]["id"] and m["status"] == "absent" for m in grid2["marks"]), grid2
        assert c.get(f"/api/attendance/grid?batch_id={bid}&month=nope", headers=h).status_code == 400
        # tutor: only their own batch + only their own session as columns
        assert [b["id"] for b in c.get("/api/attendance/batches", headers=th).json()] == [bid]
        tgrid = c.get(f"/api/attendance/grid?batch_id={bid}&month=2030-01", headers=th).json()
        assert {s["id"] for s in tgrid["sessions"]} == {tsess}, tgrid
        assert c.get("/api/attendance/batches", headers=ph).status_code == 403  # parent blocked

        # List endpoints carry display names / rosters (no client-side id->name mapping)
        pay_rows = c.get("/api/payments", headers=h).json()
        assert any(p["student_name"] == "Asha" and p["batch_name"] == "Sat AM" for p in pay_rows), pay_rows
        sess_rows = c.get(f"/api/sessions?batch_id={bid}", headers=h).json()
        assert all(s.get("batch_name") == "Sat AM" for s in sess_rows), sess_rows
        batch_rows = c.get("/api/batches", headers=h).json()
        bat = next(b for b in batch_rows if b["id"] == bid)
        assert any(st["name"] == "Asha" for st in bat["students"]) and bat["student_count"] >= 1, bat

        # Dues: a fee-bearing batch surfaces enrolled-but-unpaid students for a month
        fb = c.post("/api/batches", json={"name": "Fee Batch", "classes_per_week": 1, "monthly_fee": 800}, headers=h).json()
        assert fb["monthly_fee"] == 800.0, fb
        fsid = c.post("/api/students", json={"name": "Payer"}, headers=h).json()["id"]
        c.post("/api/students/enroll", json={"student_id": fsid, "batch_id": fb["id"]}, headers=h)
        d1 = c.get("/api/reports/dues?month=2026-06", headers=h).json()
        row = next(r for r in d1["rows"] if r["student_id"] == fsid and r["batch_id"] == fb["id"])
        assert row["outstanding"] == 800.0 and row["paid"] == 0.0, d1
        # recording the month's fee clears them from dues
        c.post("/api/payments", json={"amount": 800, "method": "cash", "student_id": fsid, "batch_id": fb["id"], "period_month": "2026-06"}, headers=h)
        d2 = c.get("/api/reports/dues?month=2026-06", headers=h).json()
        assert not any(r["student_id"] == fsid and r["batch_id"] == fb["id"] for r in d2["rows"]), d2
        # bad month rejected; dues is staff-only
        assert c.get("/api/reports/dues?month=nope", headers=h).status_code == 400
        assert c.get("/api/reports/dues?month=2026-06", headers=ph).status_code == 403  # parent
        assert c.get("/api/reports/dues?month=2026-06", headers=th).status_code == 403  # tutor

    print("smoke OK")


if __name__ == "__main__":
    run()
