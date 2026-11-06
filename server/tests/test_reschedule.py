import pytest
import uuid
from fastapi import HTTPException
from server.app.models import (
    SemesterPeriode, Kelas, Ruangan, Hari, SlotWaktu, Dosen,
    VersiJadwal, Jadwal, PermohonanGantiJadwal, AuditLog
)
from server.app.models.enums import StatusVersiJadwal, StatusJadwal
from server.app.schemas.reschedule import (
    RescheduleRequestCreate, RescheduleReviewAction
)
from server.app.api.v1.endpoints.reschedule import (
    get_available_reschedule_slots,
    submit_reschedule_request,
    get_reschedule_requests,
    review_reschedule_request
)

@pytest.fixture
def published_schedule(db_session):
    periode = db_session.query(SemesterPeriode).first()
    kelas = db_session.query(Kelas).first()
    ruang = db_session.query(Ruangan).filter(Ruangan.kapasitas >= 35).first()
    hari = db_session.query(Hari).first()
    slot = db_session.query(SlotWaktu).filter(SlotWaktu.nomor == 1).first()

    versi = VersiJadwal(
        id=uuid.uuid4(),
        semester_periode_id=periode.id,
        nomor_versi=1,
        nama="Jadwal Final Resmi",
        status=StatusVersiJadwal.PUBLISHED,
        fitness_score=0.99
    )
    db_session.add(versi)

    jadwal = Jadwal(
        id=uuid.uuid4(),
        versi_jadwal_id=versi.id,
        kelas_id=kelas.id,
        ruangan_id=ruang.id,
        hari_id=hari.id,
        slot_mulai_id=slot.id,
        durasi_slot=2,
        status=StatusJadwal.ACTIVE
    )
    db_session.add(jadwal)
    db_session.commit()
    return jadwal

def test_available_slots_calculation(published_schedule, db_session):
    dosen = published_schedule.kelas.pengampu_list[0].dosen
    slots = get_available_reschedule_slots(
        jadwal_id=published_schedule.id,
        dosen_id=dosen.id,
        db=db_session
    )
    assert len(slots) > 0
    first_slot = slots[0]
    assert first_slot.hari_id is not None
    assert first_slot.slot_id is not None
    assert first_slot.ruangan_id is not None
    assert first_slot.kapasitas >= published_schedule.kelas.jumlah_mahasiswa

def test_submit_reschedule_wrong_nidn_rejected(published_schedule, db_session):
    dosen = published_schedule.kelas.pengampu_list[0].dosen
    ruang = published_schedule.ruangan

    payload = RescheduleRequestCreate(
        jadwal_id=published_schedule.id,
        dosen_id=dosen.id,
        nidn_verification="SALAH_NIDN_9999",
        ruangan_tujuan_id=ruang.id,
        hari_tujuan_id=2, # Selasa
        slot_tujuan_id=published_schedule.slot_mulai_id,
        alasan="Ada seminar nasional"
    )

    with pytest.raises(HTTPException) as exc:
        submit_reschedule_request(payload=payload, db=db_session)
    assert exc.value.status_code == 400
    assert "tidak sesuai" in exc.value.detail.lower()

def test_submit_and_approve_reschedule(published_schedule, db_session):
    dosen = published_schedule.kelas.pengampu_list[0].dosen
    ruang = published_schedule.ruangan
    slot = db_session.query(SlotWaktu).filter(SlotWaktu.nomor == 3).first()

    payload = RescheduleRequestCreate(
        jadwal_id=published_schedule.id,
        dosen_id=dosen.id,
        nidn_verification=dosen.nidn, # Correct NIDN
        ruangan_tujuan_id=ruang.id,
        hari_tujuan_id=2, # Move to Selasa
        slot_tujuan_id=slot.id,
        alasan="Tugas kedinasan rektorat"
    )

    # 1. Submit Request
    res = submit_reschedule_request(payload=payload, db=db_session)
    assert res["status"] == "success"
    req_id = uuid.UUID(res["request_id"])

    # 2. Verify in requests list
    items = get_reschedule_requests(status_filter="PENDING", db=db_session)
    assert len(items) == 1
    assert items[0].dosen_nama == dosen.nama_lengkap

    # 3. BAAK Approves Request
    review_action = RescheduleReviewAction(status="APPROVED", catatan_baak="Disetujui oleh Kepala BAAK")
    res_approve = review_reschedule_request(request_id=req_id, payload=review_action, db=db_session)
    assert res_approve["status"] == "success"

    # 4. Verify Jadwal physically moved
    db_session.refresh(published_schedule)
    assert published_schedule.hari_id == 2
    assert published_schedule.slot_mulai_id == slot.id
    assert published_schedule.manual_edit is True

