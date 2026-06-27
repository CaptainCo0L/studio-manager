"""End-to-end smoke check. No pytest needed: `python test_smoke.py`.

Runs the whole app against a throwaway sqlite DB and asserts the core flows,
including parent data isolation (the security-critical path).
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

        tok = c.post("/auth/login", data={"username": "admin@example.com", "password": "admin123"}).json()
        h = {"Authorization": f"Bearer {tok['access_token']}"}
        assert c.get("/users/me", headers=h).json()["role"] == "admin"

        bid = c.post("/batches", json={"name": "Sat AM", "weekly_days": "5"}, headers=h).json()["id"]
        sid = c.post("/students", json={"name": "Asha"}, headers=h).json()["id"]
        assert c.post("/students/enroll", json={"student_id": sid, "batch_id": bid}, headers=h).status_code == 201

        gen = c.post(f"/sessions/{bid}/generate", json={"weeks": 2}, headers=h).json()
        assert len(gen) == 2, gen

        # Payment ledger (no invoices): record a standalone payment
        assert c.post("/payments", json={"amount": 1000, "method": "upi", "student_id": sid}, headers=h).status_code == 201
        assert any(p["amount"] == 1000 for p in c.get("/payments", headers=h).json())

        # Parent isolation
        other = c.post("/students", json={"name": "Hidden Kid"}, headers=h).json()
        c.post("/users", json={"email": "parent@example.com", "password": "pw", "role": "parent", "student_ids": [sid]}, headers=h)
        ptok = c.post("/auth/login", data={"username": "parent@example.com", "password": "pw"}).json()
        ph = {"Authorization": f"Bearer {ptok['access_token']}"}
        assert [s["name"] for s in c.get("/students", headers=ph).json()] == ["Asha"]
        assert c.get(f"/students/{other['id']}", headers=ph).status_code == 404
        assert c.post("/students", json={"name": "x"}, headers=ph).status_code == 403

        # Session-detail isolation: parent sees a session only if their child attends it
        s0, s1 = gen[0]["id"], gen[1]["id"]
        c.post(
            "/attendance/bulk",
            json={"session_id": s0, "items": [{"student_id": sid, "status": "present"}]},
            headers=h,
        )
        assert c.get(f"/sessions/{s0}", headers=ph).status_code == 200  # child attends
        assert c.get(f"/sessions/{s1}", headers=ph).status_code == 404  # child does not
        assert c.get(f"/sessions/{s1}", headers=h).status_code == 200  # staff sees all

        # Money validation: amounts must be > 0
        assert c.post("/payments", json={"amount": -50, "method": "cash"}, headers=h).status_code == 422

        # Fees and studio settings are removed
        assert c.get("/fees/structures", headers=h).status_code == 404
        assert c.get("/settings", headers=h).status_code == 404

        # Attendance calendar: scheduled vs marked status + parent isolation
        cal = c.get(f"/students/{sid}/attendance-calendar", headers=h).json()
        by_sess = {r["session_id"]: r["status"] for r in cal}
        assert by_sess.get(s0) == "present" and by_sess.get(s1) is None, cal
        assert c.get(f"/students/{other['id']}/attendance-calendar", headers=ph).status_code == 404

        # Account self-service: change password (wrong current rejected), then change email
        assert c.post("/users/me/password", json={"current_password": "nope", "new_password": "newpass1"}, headers=h).status_code == 400
        assert c.post("/users/me/password", json={"current_password": "admin123", "new_password": "newpass1"}, headers=h).json()["ok"] is True
        assert c.post("/auth/login", data={"username": "admin@example.com", "password": "newpass1"}).status_code == 200
        assert c.put("/users/me", json={"email": "boss@example.com"}, headers=h).json()["email"] == "boss@example.com"
        assert c.get("/users/me", headers=h).json()["email"] == "boss@example.com"  # token still valid
        assert c.put("/users/me", json={"email": "parent@example.com"}, headers=h).status_code == 400  # taken

        # Roster auto-seeds unmarked enrolled students as present (leaner marking)
        roster = c.get(f"/attendance/roster/{s1}", headers=h).json()
        assert any(r["student_id"] == sid and r["status"] == "present" for r in roster), roster

        # only present/absent are valid statuses now
        for bad in ("excused", "late"):
            assert c.post("/attendance/bulk", json={"session_id": s0, "items": [{"student_id": sid, "status": bad}]}, headers=h).status_code == 400

        # --- Tutor login + portal isolation ---
        tut = c.post("/tutors", json={"name": "Tutor One", "default_rate": 500}, headers=h).json()
        tsess = c.post("/sessions", json={"session_type": "batch", "date": "2030-01-05", "batch_id": bid, "tutor_id": tut["id"]}, headers=h).json()["id"]
        c.post("/users", json={"email": "tutor@example.com", "password": "tutorpw", "role": "tutor", "tutor_id": tut["id"]}, headers=h)
        ttok = c.post("/auth/login", data={"username": "tutor@example.com", "password": "tutorpw"}).json()
        th = {"Authorization": f"Bearer {ttok['access_token']}"}
        # sees only their own session
        assert [s["id"] for s in c.get("/sessions", headers=th).json()] == [tsess]
        assert c.get(f"/sessions/{tsess}", headers=th).status_code == 200
        assert c.get(f"/sessions/{s0}", headers=th).status_code == 404  # not their session
        # roster carries names; can mark own session, not another's
        roster_t = c.get(f"/attendance/roster/{tsess}", headers=th).json()
        assert any(r["student_id"] == sid and r.get("student_name") for r in roster_t), roster_t
        assert c.post("/attendance/bulk", json={"session_id": tsess, "items": [{"student_id": sid, "status": "absent"}]}, headers=th).status_code == 200
        assert c.post("/attendance/bulk", json={"session_id": s0, "items": [{"student_id": sid, "status": "absent"}]}, headers=th).status_code == 404
        # locked out of staff data
        assert c.get("/students", headers=th).json() == []
        assert c.get("/reports/tutor-sessions", headers=th).status_code == 403
        assert c.get("/reports/my-earnings", headers=th).status_code == 200
        # a tutor can't be linked to a second login
        assert c.post("/users", json={"email": "dup@example.com", "password": "pw123", "role": "tutor", "tutor_id": tut["id"]}, headers=h).status_code == 400

        # Global search: staff finds students/batches/tutors; non-staff blocked
        res = c.get("/search?q=Asha", headers=h).json()
        assert any(hit["label"] == "Asha" for hit in res["students"]), res
        assert any(hit["label"] == "Sat AM" for hit in c.get("/search?q=Sat", headers=h).json()["batches"])
        assert any(hit["label"] == "Tutor One" for hit in c.get("/search?q=Tutor", headers=h).json()["tutors"])
        assert c.get("/search?q=Asha", headers=ph).status_code == 403  # parent blocked
        assert c.get("/search?q=Asha", headers=th).status_code == 403  # tutor blocked

        # Audit log: mutations recorded, reads/auth not; admin-only viewer
        log = c.get("/audit", headers=h).json()
        assert any(r["method"] == "POST" and r["path"] == "/students" for r in log), "student create not audited"
        assert all(r["method"] != "GET" for r in log), "GET should not be audited"
        assert all(not r["path"].startswith("/auth") for r in log), "/auth should not be audited"
        assert any(r["user_email"] == "admin@example.com" for r in log)
        assert c.get("/audit", headers=ph).status_code == 403  # parent blocked
        assert c.get("/audit", headers=th).status_code == 403  # tutor blocked

    print("smoke OK")


if __name__ == "__main__":
    run()
