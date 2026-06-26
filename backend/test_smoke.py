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

        iid = c.post("/fees/invoices", json={"student_id": sid, "amount_due": 1500}, headers=h).json()["id"]
        assert c.post("/payments", json={"amount": 1000, "method": "upi", "invoice_id": iid}, headers=h).status_code == 201
        inv = c.get("/fees/invoices", headers=h).json()[0]
        assert inv["balance"] == 500 and inv["status"] == "partial", inv

        # Parent isolation
        other = c.post("/students", json={"name": "Hidden Kid"}, headers=h).json()
        c.post("/users", json={"email": "parent@example.com", "password": "pw", "role": "parent", "student_ids": [sid]}, headers=h)
        ptok = c.post("/auth/login", data={"username": "parent@example.com", "password": "pw"}).json()
        ph = {"Authorization": f"Bearer {ptok['access_token']}"}
        assert [s["name"] for s in c.get("/students", headers=ph).json()] == ["Asha"]
        assert c.get(f"/students/{other['id']}", headers=ph).status_code == 404
        assert c.post("/students", json={"name": "x"}, headers=ph).status_code == 403

    print("smoke OK")


if __name__ == "__main__":
    run()
