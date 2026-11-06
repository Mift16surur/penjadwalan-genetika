import pytest
from server.app.models import SemesterPeriode, Dosen, Hari, SlotWaktu, KetersediaanDosen
from server.app.models.enums import StatusPeriode, SemesterTipe
from server.app.schemas.schedule_master import SemesterPeriodeCreate
from server.app.schemas.constraints import LecturerAvailabilityBulkPayload, LecturerAvailabilityBulkItem
from server.app.api.v1.endpoints.master import (
    get_periods, create_period, activate_period,
    get_departments, get_rooms, get_days, get_time_slots
)
from server.app.api.v1.endpoints.constraints import save_bulk_availabilities

def test_get_periods(db_session):
    data = get_periods(db=db_session)
    assert len(data) >= 1
    assert data[0].status == StatusPeriode.ACTIVE

def test_create_and_activate_period(db_session):
    # 1. Create new period
    payload = SemesterPeriodeCreate(
        tahun_ajaran="2027/2028",
        semester=SemesterTipe.GENAP,
        status=StatusPeriode.DRAFT
    )
    new_period = create_period(payload=payload, db=db_session)
    assert new_period.kode == "2027/2028-GENAP"
    assert new_period.status == StatusPeriode.DRAFT

    # 2. Activate this new period
    activated = activate_period(period_id=new_period.id, db=db_session)
    assert activated.status == StatusPeriode.ACTIVE

    # 3. Check previous period is auto-archived
    old_period = db_session.query(SemesterPeriode).filter(SemesterPeriode.kode == "2026/2027-GASAL").first()
    assert old_period.status == StatusPeriode.ARCHIVED

def test_get_departments_and_rooms(db_session):
    depts = get_departments(db=db_session)
    assert len(depts) >= 1
    assert depts[0].kode == "IF"

    rooms = get_rooms(db=db_session)
    assert len(rooms) >= 2

def test_get_days_and_slots(db_session):
    days = get_days(db=db_session)
    assert len(days) == 2

    slots = get_time_slots(db=db_session)
    assert len(slots) == 8

def test_save_bulk_lecturer_availabilities(db_session):
    dosen = db_session.query(Dosen).first()
    periode = db_session.query(SemesterPeriode).filter(SemesterPeriode.status == StatusPeriode.ACTIVE).first()
    hari = db_session.query(Hari).first()
    slot = db_session.query(SlotWaktu).first()

    payload = LecturerAvailabilityBulkPayload(
        dosen_id=dosen.id,
        semester_periode_id=periode.id,
        items=[
            LecturerAvailabilityBulkItem(hari_id=hari.id, slot_id=slot.id, tersedia=False)
        ]
    )

    res = save_bulk_availabilities(payload=payload, db=db_session)
    assert res["total_unavailable"] == 1

    # Verify DB
    count = db_session.query(KetersediaanDosen).filter(
        KetersediaanDosen.dosen_id == dosen.id,
        KetersediaanDosen.tersedia == False
    ).count()
    assert count == 1

