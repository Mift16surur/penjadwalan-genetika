import pytest
import uuid
from server.app.models import (
    SemesterPeriode, Kelas, Ruangan, Hari, SlotWaktu, Dosen,
    VersiJadwal, Jadwal, PermohonanGantiJadwal, AuditLog
)
from server.app.models.enums import StatusVersiJadwal, StatusJadwal

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

def test_available_slots_calculation(client, published_schedule, db_session):
    dosen = published_schedule.kelas.pengampu_list[0].dosen
    res = client.get(f"/api/v1/reschedule/available-slots?jadwal_id={published_schedule.id}&dosen_id={dosen.id}")
    assert res.status_code == 200
    slots = res.json()
    assert len(slots) > 0
    # Every slot must have required fields
    first_slot = slots[0]
    assert "hari_id" in first_slot
    assert "slot_id" in first_slot
    assert "ruangan_id" in first_slot
    assert first_slot["kapasitas"] >= published_schedule.kelas.jumlah_mahasiswa

def test_submit_reschedule_wrong_nidn_rejected(client, published_schedule):
    dosen = published_schedule.kelas.pengampu_list[0].dosen
    ruang = published_schedule.ruangan

    payload = {
        "jadwal_id": str(published_schedule.id),
        "dosen_id": str(dosen.id),
        "nidn_verification": "SALAH_NIDN_9999",
        "ruangan_tujuan_id": str(ruang.id),
        "hari_tujuan_id": 2, # Selasa
        "slot_tujuan_id": str(published_schedule.slot_mulai_id),
        "alasan": "Ada seminar nasional"
    }

    res = client.post("/api/v1/reschedule/request", json=payload)
    assert res.status_code == 400
    assert "tidak sesuai" in res.json()["detail"].lower()

def test_submit_and_approve_reschedule(client, published_schedule, db_session):
    dosen = published_schedule.kelas.pengampu_list[0].dosen
    ruang = published_schedule.ruangan
    slot = db_session.query(SlotWaktu).filter(SlotWaktu.nomor == 3).first()

    payload = {
        "jadwal_id": str(published_schedule.id),
        "dosen_id": str(dosen.id),
        "nidn_verification": dosen.nidn, # Correct NIDN
        "ruangan_tujuan_id": str(ruang.id),
        "hari_tujuan_id": 2, # Move to Selasa
        "slot_tujuan_id": str(slot.id),
        "alasan": "Tugas kedinasan rektorat"
    }

    # 1. Submit Request
    res = client.post("/api/v1/reschedule/request", json=payload)
    assert res.status_code == 200
    assert res.json()["status"] == "success"
    req_id = res.json()["request_id"]

    # 2. Verify in requests list
    res_list = client.get("/api/v1/reschedule/requests?status_filter=PENDING")
    assert res_list.status_code == 200
    items = res_list.json()
    assert len(items) == 1
    assert items[0]["dosen_nama"] == dosen.nama_lengkap

    # 3. BAAK Approves Request
    res_approve = client.post(
        f"/api/v1/reschedule/requests/{req_id}/review",
        json={"status": "APPROVED", "catatan_baak": "Disetujui oleh Kepala BAAK"}
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "success"

    # 4. Verify Jadwal physically moved
    db_session.refresh(published_schedule)
    assert published_schedule.hari_id == 2
    assert published_schedule.slot_mulai_id == slot.id
    assert published_schedule.manual_edit is True

