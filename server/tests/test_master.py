import pytest
from server.app.models import SemesterPeriode, Dosen, Hari, SlotWaktu, KetersediaanDosen
from server.app.models.enums import StatusPeriode, SemesterTipe

def test_get_periods(client):
    res = client.get("/api/v1/master/periods")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert data[0]["status"] == "ACTIVE"

def test_create_and_activate_period(client, db_session):
    # 1. Create new period
    payload = {
        "tahun_ajaran": "2027/2028",
        "semester": "GENAP",
        "status": "DRAFT"
    }
    res = client.post("/api/v1/master/periods", json=payload)
    assert res.status_code == 200
    new_period = res.json()
    assert new_period["kode"] == "2027/2028-GENAP"
    assert new_period["status"] == "DRAFT"

    # 2. Activate this new period
    p_id = new_period["id"]
    res_act = client.post(f"/api/v1/master/periods/{p_id}/activate")
    assert res_act.status_code == 200
    assert res_act.json()["status"] == "ACTIVE"

    # 3. Check previous period is auto-archived
    old_period = db_session.query(SemesterPeriode).filter(SemesterPeriode.kode == "2026/2027-GASAL").first()
    assert old_period.status == StatusPeriode.ARCHIVED

def test_get_departments_and_rooms(client):
    res_dept = client.get("/api/v1/master/departments")
    assert res_dept.status_code == 200
    assert len(res_dept.json()) >= 1
    assert res_dept.json()[0]["kode"] == "IF"

    res_rooms = client.get("/api/v1/master/rooms")
    assert res_rooms.status_code == 200
    assert len(res_rooms.json()) >= 2

def test_get_days_and_slots(client):
    res_days = client.get("/api/v1/master/days")
    assert res_days.status_code == 200
    assert len(res_days.json()) == 2

    res_slots = client.get("/api/v1/master/time-slots")
    assert res_slots.status_code == 200
    assert len(res_slots.json()) == 8

def test_save_bulk_lecturer_availabilities(client, db_session):
    dosen = db_session.query(Dosen).first()
    periode = db_session.query(SemesterPeriode).filter(SemesterPeriode.status == StatusPeriode.ACTIVE).first()
    hari = db_session.query(Hari).first()
    slot = db_session.query(SlotWaktu).first()

    payload = {
        "dosen_id": str(dosen.id),
        "semester_periode_id": str(periode.id),
        "items": [
            {"hari_id": hari.id, "slot_id": str(slot.id), "tersedia": False}
        ]
    }

    res = client.post("/api/v1/constraints/lecturer-availabilities/bulk", json=payload)
    assert res.status_code == 200
    assert res.json()["total_unavailable"] == 1

    # Verify DB
    count = db_session.query(KetersediaanDosen).filter(
        KetersediaanDosen.dosen_id == dosen.id,
        KetersediaanDosen.tersedia == False
    ).count()
    assert count == 1

