from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from server.app.api.deps import get_db, get_current_admin
from server.app.models import (
    Jadwal, Dosen, Ruangan, Hari, SlotWaktu, Kelas, MataKuliah,
    PermohonanGantiJadwal, AuditLog, PengampuKelas
)
from server.app.models.enums import AksiAudit, StatusJadwal, JenisRuangan, JenisMataKuliah
from server.app.models.user import User
from server.app.schemas.reschedule import (
    RescheduleRequestCreate, RescheduleReviewAction,
    AvailableSlotItem, PermohonanGantiJadwalOut
)

router = APIRouter()

@router.get("/available-slots", response_model=List[AvailableSlotItem])
def get_available_reschedule_slots(
    jadwal_id: uuid.UUID,
    dosen_id: uuid.UUID,
    db: Session = Depends(get_db)
):
    """Mencari dan menghitung slot waktu serta ruangan yang 100% KOSONG dan bebas bentrok untuk pengajuan dosen."""
    jadwal = db.query(Jadwal).filter(Jadwal.id == jadwal_id).first()
    if not jadwal:
        raise HTTPException(status_code=404, detail="Jadwal tidak ditemukan.")

    dosen = db.query(Dosen).filter(Dosen.id == dosen_id).first()
    if not dosen:
        raise HTTPException(status_code=404, detail="Dosen tidak ditemukan.")

    versi_id = jadwal.versi_jadwal_id
    durasi = jadwal.durasi_slot
    kelas = jadwal.kelas

    # Ambil seluruh jadwal aktif pada versi ini selain sesi yang sedang ingin dipindah
    other_schedules = db.query(Jadwal).filter(
        Jadwal.versi_jadwal_id == versi_id,
        Jadwal.id != jadwal.id,
        Jadwal.status == StatusJadwal.ACTIVE
    ).all()

    # Pre-map okupansi
    # 1. Okupansi Dosen: set of (hari_id, slot_nomor)
    dosen_occupied = set()
    # 2. Okupansi Rombel Kelas: set of (hari_id, slot_nomor)
    kelas_occupied = set()
    # 3. Okupansi Ruangan: set of (ruangan_id, hari_id, slot_nomor)
    room_occupied = set()

    for s in other_schedules:
        s_dosen_ids = [p.dosen_id for p in s.kelas.pengampu_list] if s.kelas else []
        for sn in range(s.slot_mulai.nomor, s.slot_mulai.nomor + s.durasi_slot):
            room_occupied.add((s.ruangan_id, s.hari_id, sn))
            if dosen.id in s_dosen_ids:
                dosen_occupied.add((s.hari_id, sn))
            if s.kelas_id == jadwal.kelas_id:
                kelas_occupied.add((s.hari_id, sn))

    hari_list = db.query(Hari).order_by(Hari.id).all()
    slot_list = db.query(SlotWaktu).filter(SlotWaktu.aktif == True).order_by(SlotWaktu.nomor).all()
    slot_map_by_nomor = {s.nomor: s for s in slot_list}

    # Filter ruangan: jika mata kuliah praktikum, wajib lab
    is_praktik = kelas.mata_kuliah.jenis == JenisMataKuliah.PRAKTIK if (kelas and kelas.mata_kuliah) else False
    ruangan_query = db.query(Ruangan).filter(Ruangan.aktif == True)
    if is_praktik:
        ruangan_query = ruangan_query.filter(Ruangan.jenis == JenisRuangan.LABORATORIUM)

    ruangan_list = ruangan_query.order_by(Ruangan.kapasitas.desc()).all()

    available_slots: List[AvailableSlotItem] = []

    for h in hari_list:
        for s_mulai in slot_list:
            nomor_mulai = s_mulai.nomor
            nomor_selesai = nomor_mulai + durasi - 1

            # Pastikan slot akhir ada dalam shift dan hari yang sama
            if nomor_selesai not in slot_map_by_nomor:
                continue
            s_akhir = slot_map_by_nomor[nomor_selesai]
            if s_mulai.shift_id != s_akhir.shift_id:
                continue

            # Cek apakah dosen bentrok di rentang slot ini
            dosen_bentrok = any((h.id, sn) in dosen_occupied for sn in range(nomor_mulai, nomor_selesai + 1))
            if dosen_bentrok:
                continue

            # Cek apakah rombel kelas bentrok
            kelas_bentrok = any((h.id, sn) in kelas_occupied for sn in range(nomor_mulai, nomor_selesai + 1))
            if kelas_bentrok:
                continue

            # Cari ruangan yang cocok dan kosong
            for r in ruangan_list:
                # Cek kapasitas
                if kelas and r.kapasitas < kelas.jumlah_mahasiswa:
                    continue

                # Cek okupansi ruangan
                room_bentrok = any((r.id, h.id, sn) in room_occupied for sn in range(nomor_mulai, nomor_selesai + 1))
                if not room_bentrok:
                    available_slots.append(AvailableSlotItem(
                        hari_id=h.id,
                        hari_nama=h.nama,
                        slot_id=s_mulai.id,
                        slot_nomor=s_mulai.nomor,
                        jam_mulai=s_mulai.jam_mulai.strftime("%H:%M"),
                        jam_selesai=s_akhir.jam_selesai.strftime("%H:%M"),
                        ruangan_id=r.id,
                        ruangan_kode=r.kode,
                        ruangan_nama=r.nama,
                        ruangan_gedung=r.gedung,
                        kapasitas=r.kapasitas,
                        jenis=r.jenis.value if hasattr(r.jenis, "value") else str(r.jenis)
                    ))
                    # Batasi maksimal 30 rekomendasi agar ringan
                    if len(available_slots) >= 30:
                        return available_slots

    return available_slots


@router.post("/request")
def submit_reschedule_request(
    payload: RescheduleRequestCreate,
    db: Session = Depends(get_db)
):
    """Pengajuan pergantian jadwal mandiri oleh Dosen tanpa login (Verifikasi NIDN)."""
    dosen = db.query(Dosen).filter(Dosen.id == payload.dosen_id).first()
    if not dosen:
        raise HTTPException(status_code=404, detail="Dosen tidak ditemukan.")

    # Verifikasi NIDN
    nidn_input = payload.nidn_verification.strip()
    actual_nidn = (dosen.nidn or "").strip()
    
    # Cek kecocokan NIDN (toleransi jika dosen di database belum punya NIDN, cocokkan dengan nama)
    if actual_nidn:
        if nidn_input.lower() != actual_nidn.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Nomor NIDN yang Anda masukkan tidak sesuai dengan data dosen {dosen.nama_lengkap}."
            )
    else:
        # Fallback jika NIDN belum diset di master
        if len(nidn_input) < 3:
            raise HTTPException(status_code=400, detail="Masukkan minimal 3 karakter untuk verifikasi.")

    jadwal = db.query(Jadwal).filter(Jadwal.id == payload.jadwal_id).first()
    if not jadwal:
        raise HTTPException(status_code=404, detail="Sesi jadwal tidak ditemukan.")

    # Pastikan dosen ini benar-benar pengampu kelas terkait
    pengampu_ids = [p.dosen_id for p in jadwal.kelas.pengampu_list] if (jadwal.kelas and jadwal.kelas.pengampu_list) else []
    if dosen.id not in pengampu_ids:
        raise HTTPException(status_code=403, detail="Anda bukan dosen pengampu untuk kelas ini.")

    # Cek apakah sudah ada request PENDING untuk jadwal ini
    existing = db.query(PermohonanGantiJadwal).filter(
        PermohonanGantiJadwal.jadwal_id == jadwal.id,
        PermohonanGantiJadwal.status == "PENDING"
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Sudah ada permohonan ganti jadwal untuk kelas ini yang sedang menunggu persetujuan BAAK."
        )

    permohonan = PermohonanGantiJadwal(
        jadwal_id=payload.jadwal_id,
        dosen_id=payload.dosen_id,
        ruangan_tujuan_id=payload.ruangan_tujuan_id,
        hari_tujuan_id=payload.hari_tujuan_id,
        slot_tujuan_id=payload.slot_tujuan_id,
        alasan=payload.alasan.strip(),
        status="PENDING"
    )
    db.add(permohonan)
    db.commit()
    db.refresh(permohonan)

    return {
        "status": "success",
        "message": "Permohonan ganti jadwal berhasil diajukan dan sedang menunggu persetujuan BAAK.",
        "request_id": str(permohonan.id)
    }


@router.get("/requests", response_model=List[PermohonanGantiJadwalOut])
def get_reschedule_requests(
    status_filter: Optional[str] = Query("ALL", description="Filter: PENDING, APPROVED, REJECTED, ALL"),
    db: Session = Depends(get_db)
):
    """Melihat daftar permohonan ganti jadwal dosen (untuk panel admin & rekap)."""
    query = db.query(PermohonanGantiJadwal)
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(PermohonanGantiJadwal.status == status_filter.upper())

    records = query.order_by(PermohonanGantiJadwal.created_at.desc()).all()

    result: List[PermohonanGantiJadwalOut] = []
    for r in records:
        jadwal = r.jadwal
        kelas = jadwal.kelas if jadwal else None
        mk = kelas.mata_kuliah if kelas else None
        dosen = r.dosen
        r_tujuan = r.ruangan_tujuan
        h_tujuan = r.hari_tujuan
        s_tujuan = r.slot_tujuan

        # Hitung jam asal
        end_nomor_asal = jadwal.slot_mulai.nomor + jadwal.durasi_slot - 1 if (jadwal and jadwal.slot_mulai) else 1
        end_slot_asal = db.query(SlotWaktu).filter(SlotWaktu.nomor == end_nomor_asal).first()
        jam_asal = f"{jadwal.slot_mulai.jam_mulai.strftime('%H:%M')} - {end_slot_asal.jam_selesai.strftime('%H:%M')}" if (jadwal and jadwal.slot_mulai and end_slot_asal) else "-"

        # Hitung jam tujuan
        end_nomor_tujuan = s_tujuan.nomor + (jadwal.durasi_slot if jadwal else 2) - 1 if s_tujuan else 1
        end_slot_tujuan = db.query(SlotWaktu).filter(SlotWaktu.nomor == end_nomor_tujuan).first()
        jam_tujuan = f"{s_tujuan.jam_mulai.strftime('%H:%M')} - {end_slot_tujuan.jam_selesai.strftime('%H:%M')}" if (s_tujuan and end_slot_tujuan) else "-"

        result.append(PermohonanGantiJadwalOut(
            id=r.id,
            jadwal_id=r.jadwal_id,
            dosen_id=r.dosen_id,
            dosen_nama=dosen.nama_lengkap if dosen else "Dosen",
            dosen_nidn=dosen.nidn if dosen else None,
            mata_kuliah_nama=mk.nama if mk else "-",
            mata_kuliah_kode=mk.kode if mk else "-",
            kelas_nama=kelas.nama_kelas if kelas else "-",
            kelas_kode=kelas.kode_kelas if kelas else "-",
            sks=kelas.sks if kelas else 2,
            hari_asal=jadwal.hari.nama if (jadwal and jadwal.hari) else "-",
            jam_asal=jam_asal,
            ruangan_asal=f"{jadwal.ruangan.nama} ({jadwal.ruangan.kode})" if (jadwal and jadwal.ruangan) else "-",
            hari_tujuan_id=r.hari_tujuan_id,
            hari_tujuan=h_tujuan.nama if h_tujuan else "-",
            slot_tujuan_id=r.slot_tujuan_id,
            jam_tujuan=jam_tujuan,
            ruangan_tujuan_id=r.ruangan_tujuan_id,
            ruangan_tujuan=r_tujuan.nama if r_tujuan else "-",
            ruangan_tujuan_gedung=r_tujuan.gedung if r_tujuan else None,
            alasan=r.alasan,
            status=r.status,
            catatan_baak=r.catatan_baak,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))

    return result


@router.post("/requests/{request_id}/review")
def review_reschedule_request(
    request_id: uuid.UUID,
    payload: RescheduleReviewAction,
    db: Session = Depends(get_db)
):
    """Menyetujui (Approve) atau Menolak (Reject) permohonan ganti jadwal oleh Petugas BAAK."""
    req = db.query(PermohonanGantiJadwal).filter(PermohonanGantiJadwal.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Permohonan tidak ditemukan.")

    if req.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Permohonan ini sudah diproses sebelumnya dengan status {req.status}.")

    action_status = payload.status.upper().strip()
    if action_status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Status harus 'APPROVED' atau 'REJECTED'.")

    req.status = action_status
    req.catatan_baak = payload.catatan_baak

    if action_status == "APPROVED":
        jadwal = req.jadwal
        if not jadwal:
            raise HTTPException(status_code=404, detail="Data jadwal asli tidak ditemukan.")

        data_lama = {
            "ruangan_id": str(jadwal.ruangan_id),
            "hari_id": jadwal.hari_id,
            "slot_mulai_id": str(jadwal.slot_mulai_id)
        }

        # Pindahkan jadwal di database
        jadwal.ruangan_id = req.ruangan_tujuan_id
        jadwal.hari_id = req.hari_tujuan_id
        jadwal.slot_mulai_id = req.slot_tujuan_id
        jadwal.manual_edit = True

        # Catat Audit Log
        db.add(AuditLog(
            aksi=AksiAudit.UPDATE,
            entitas="jadwal",
            entitas_id=jadwal.id,
            data_lama=data_lama,
            data_baru={
                "ruangan_id": str(jadwal.ruangan_id),
                "hari_id": jadwal.hari_id,
                "slot_mulai_id": str(jadwal.slot_mulai_id),
                "approved_reschedule_id": str(req.id)
            }
        ))

    db.commit()
    db.refresh(req)

    return {
        "status": "success",
        "message": f"Permohonan ganti jadwal berhasil di-{action_status.lower()}.",
        "request_status": req.status
    }

