from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid

from server.app.api.deps import get_db
from server.app.models import (
    VersiJadwal, Jadwal, Ruangan, Kelas, Dosen, Hari, SlotWaktu,
    SemesterPeriode, PengampuKelas
)
from server.app.models.enums import StatusVersiJadwal, StatusJadwal

router = APIRouter()

def _get_active_version(db: Session, periode_id: Optional[uuid.UUID] = None) -> Optional[VersiJadwal]:
    query = db.query(VersiJadwal).filter(VersiJadwal.status == StatusVersiJadwal.PUBLISHED)
    if periode_id:
        query = query.filter(VersiJadwal.semester_periode_id == periode_id)
    versi = query.order_by(VersiJadwal.approved_at.desc(), VersiJadwal.nomor_versi.desc()).first()
    if not versi:
        # Fallback to latest available version
        versi = db.query(VersiJadwal).order_by(VersiJadwal.nomor_versi.desc()).first()
    return versi

@router.get("/schedule/active")
def get_public_active_schedule(
    prodi_id: Optional[uuid.UUID] = None,
    hari_id: Optional[int] = None,
    ruangan_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
    """Mendapatkan data jadwal kuliah aktif resmi untuk portal publik mahasiswa & dosen."""
    versi = _get_active_version(db)
    if not versi:
        return {"status": "empty", "message": "Belum ada jadwal perkuliahan yang dipublikasikan.", "data": []}

    query = db.query(Jadwal).filter(
        Jadwal.versi_jadwal_id == versi.id,
        Jadwal.status == StatusJadwal.ACTIVE
    )

    if hari_id:
        query = query.filter(Jadwal.hari_id == hari_id)
    if ruangan_id:
        query = query.filter(Jadwal.ruangan_id == ruangan_id)

    items = query.all()

    # Format response
    result = []
    for item in items:
        # Filter prodi jika diminta
        if prodi_id and item.kelas and item.kelas.prodi_id != prodi_id:
            continue

        dosen_list = []
        if item.kelas and item.kelas.pengampu_list:
            dosen_list = [
                {
                    "id": str(p.dosen.id),
                    "nama": p.dosen.nama_lengkap,
                    "peran": p.peran.value if hasattr(p.peran, "value") else str(p.peran)
                }
                for p in item.kelas.pengampu_list if p.dosen
            ]

        end_nomor = item.slot_mulai.nomor + item.durasi_slot - 1 if item.slot_mulai else 1
        end_slot = db.query(SlotWaktu).filter(SlotWaktu.nomor == end_nomor).first()

        result.append({
            "id": str(item.id),
            "hari": {
                "id": item.hari.id,
                "nama": item.hari.nama
            } if item.hari else None,
            "jam_mulai": item.slot_mulai.jam_mulai.strftime("%H:%M") if item.slot_mulai else "-",
            "jam_selesai": end_slot.jam_selesai.strftime("%H:%M") if end_slot else "-",
            "ruangan": {
                "id": str(item.ruangan.id),
                "kode": item.ruangan.kode,
                "nama": item.ruangan.nama,
                "gedung": item.ruangan.gedung,
                "jenis": item.ruangan.jenis.value if hasattr(item.ruangan.jenis, "value") else str(item.ruangan.jenis)
            } if item.ruangan else None,
            "kelas": {
                "id": str(item.kelas.id),
                "kode_kelas": item.kelas.kode_kelas,
                "nama_kelas": item.kelas.nama_kelas,
                "sks": item.kelas.sks,
                "mata_kuliah": item.kelas.mata_kuliah.nama if item.kelas.mata_kuliah else "-",
                "kode_mk": item.kelas.mata_kuliah.kode if item.kelas.mata_kuliah else "-",
                "dosen_pengampu": dosen_list
            } if item.kelas else None
        })

    return {
        "status": "success",
        "versi": {
            "id": str(versi.id),
            "nama": versi.nama,
            "nomor_versi": versi.nomor_versi,
            "fitness_score": versi.fitness_score,
            "approved_at": versi.approved_at.isoformat() if versi.approved_at else None
        },
        "total_jadwal": len(result),
        "data": result
    }

@router.get("/room/{kode_ruang}")
def get_public_room_schedule(kode_ruang: str, db: Session = Depends(get_db)):
    """Hasil scan QR Code Pintu Ruangan: Menampilkan seluruh agenda kuliah di ruangan ini."""
    ruang = db.query(Ruangan).filter(Ruangan.kode.ilike(kode_ruang.strip())).first()
    if not ruang:
        raise HTTPException(status_code=404, detail=f"Ruangan dengan kode '{kode_ruang}' tidak ditemukan.")

    versi = _get_active_version(db)
    if not versi:
        return {"status": "empty", "ruangan": ruang.nama, "data": []}

    jadwal_items = db.query(Jadwal).filter(
        Jadwal.versi_jadwal_id == versi.id,
        Jadwal.ruangan_id == ruang.id,
        Jadwal.status == StatusJadwal.ACTIVE
    ).all()

    jadwal_list = []
    for item in jadwal_items:
        dosen_names = [p.dosen.nama_lengkap for p in item.kelas.pengampu_list if p.dosen] if item.kelas else []
        end_nomor = item.slot_mulai.nomor + item.durasi_slot - 1 if item.slot_mulai else 1
        end_slot = db.query(SlotWaktu).filter(SlotWaktu.nomor == end_nomor).first()

        jadwal_list.append({
            "jadwal_id": str(item.id),
            "hari_id": item.hari.id if item.hari else 1,
            "hari": item.hari.nama if item.hari else "-",
            "jam_mulai": item.slot_mulai.jam_mulai.strftime("%H:%M") if item.slot_mulai else "-",
            "jam_selesai": end_slot.jam_selesai.strftime("%H:%M") if end_slot else "-",
            "kode_kelas": item.kelas.kode_kelas if item.kelas else "-",
            "nama_mk": item.kelas.mata_kuliah.nama if item.kelas and item.kelas.mata_kuliah else "-",
            "sks": item.kelas.sks if item.kelas else 0,
            "dosen": ", ".join(dosen_names) or "Dosen Pengampu",
            "jumlah_mahasiswa": item.kelas.jumlah_mahasiswa if item.kelas else 0
        })

    # Sort berdasarkan hari dan jam
    jadwal_list.sort(key=lambda x: (x["hari_id"], x["jam_mulai"]))

    return {
        "status": "success",
        "ruangan": {
            "id": str(ruang.id),
            "kode": ruang.kode,
            "nama": ruang.nama,
            "gedung": ruang.gedung,
            "lantai": ruang.lantai,
            "kapasitas": ruang.kapasitas,
            "jenis": ruang.jenis.value if hasattr(ruang.jenis, "value") else str(ruang.jenis)
        },
        "total_sesi": len(jadwal_list),
        "data": jadwal_list
    }

@router.get("/class/{kode_kelas}")
def get_public_class_schedule(kode_kelas: str, db: Session = Depends(get_db)):
    """Hasil scan QR Code Rombel Mahasiswa: Menampilkan jadwal kuliah spesifik rombel."""
    kelas = db.query(Kelas).filter(Kelas.kode_kelas.ilike(kode_kelas.strip())).first()
    if not kelas:
        raise HTTPException(status_code=404, detail=f"Rombel kelas '{kode_kelas}' tidak ditemukan.")

    versi = _get_active_version(db)
    if not versi:
        return {"status": "empty", "kelas": kelas.nama_kelas, "data": []}

    jadwal_items = db.query(Jadwal).filter(
        Jadwal.versi_jadwal_id == versi.id,
        Jadwal.kelas_id == kelas.id,
        Jadwal.status == StatusJadwal.ACTIVE
    ).all()

    jadwal_list = []
    for item in jadwal_items:
        dosen_names = [p.dosen.nama_lengkap for p in kelas.pengampu_list if p.dosen]
        end_nomor = item.slot_mulai.nomor + item.durasi_slot - 1 if item.slot_mulai else 1
        end_slot = db.query(SlotWaktu).filter(SlotWaktu.nomor == end_nomor).first()

        jadwal_list.append({
            "jadwal_id": str(item.id),
            "hari_id": item.hari.id if item.hari else 1,
            "hari": item.hari.nama if item.hari else "-",
            "jam_mulai": item.slot_mulai.jam_mulai.strftime("%H:%M") if item.slot_mulai else "-",
            "jam_selesai": end_slot.jam_selesai.strftime("%H:%M") if end_slot else "-",
            "ruangan": f"{item.ruangan.nama} ({item.ruangan.kode})" if item.ruangan else "-",
            "gedung": item.ruangan.gedung if item.ruangan else "-",
            "dosen": ", ".join(dosen_names) or "-"
        })

    jadwal_list.sort(key=lambda x: (x["hari_id"], x["jam_mulai"]))

    return {
        "status": "success",
        "kelas": {
            "id": str(kelas.id),
            "kode_kelas": kelas.kode_kelas,
            "nama_kelas": kelas.nama_kelas,
            "mata_kuliah": kelas.mata_kuliah.nama if kelas.mata_kuliah else "-",
            "sks": kelas.sks,
            "jumlah_mahasiswa": kelas.jumlah_mahasiswa
        },
        "total_sesi": len(jadwal_list),
        "data": jadwal_list
    }

@router.get("/lecturer/{lecturer_id}")
def get_public_lecturer_schedule(lecturer_id: uuid.UUID, db: Session = Depends(get_db)):
    """Hasil scan QR Code Dosen: Menampilkan jadwal mengajar pribadi seorang dosen."""
    dosen = db.query(Dosen).filter(Dosen.id == lecturer_id).first()
    if not dosen:
        raise HTTPException(status_code=404, detail="Dosen tidak ditemukan.")

    versi = _get_active_version(db)
    if not versi:
        return {"status": "empty", "dosen": dosen.nama_lengkap, "data": []}

    # Cari kelas-kelas yang diampu dosen ini
    pengampu_entries = db.query(PengampuKelas).filter(PengampuKelas.dosen_id == dosen.id).all()
    kelas_ids = [p.kelas_id for p in pengampu_entries]

    jadwal_items = db.query(Jadwal).filter(
        Jadwal.versi_jadwal_id == versi.id,
        Jadwal.kelas_id.in_(kelas_ids),
        Jadwal.status == StatusJadwal.ACTIVE
    ).all()

    jadwal_list = []
    for item in jadwal_items:
        end_nomor = item.slot_mulai.nomor + item.durasi_slot - 1 if item.slot_mulai else 1
        end_slot = db.query(SlotWaktu).filter(SlotWaktu.nomor == end_nomor).first()

        jadwal_list.append({
            "jadwal_id": str(item.id),
            "hari_id": item.hari.id if item.hari else 1,
            "hari": item.hari.nama if item.hari else "-",
            "jam_mulai": item.slot_mulai.jam_mulai.strftime("%H:%M") if item.slot_mulai else "-",
            "jam_selesai": end_slot.jam_selesai.strftime("%H:%M") if end_slot else "-",
            "kode_kelas": item.kelas.kode_kelas if item.kelas else "-",
            "mata_kuliah": item.kelas.mata_kuliah.nama if item.kelas and item.kelas.mata_kuliah else "-",
            "ruangan": f"{item.ruangan.nama} ({item.ruangan.kode})" if item.ruangan else "-",
            "sks": item.kelas.sks if item.kelas else 0,
            "jumlah_mahasiswa": item.kelas.jumlah_mahasiswa if item.kelas else 0
        })

    jadwal_list.sort(key=lambda x: (x["hari_id"], x["jam_mulai"]))

    return {
        "status": "success",
        "dosen": {
            "id": str(dosen.id),
            "nama_lengkap": dosen.nama_lengkap,
            "nidn": dosen.nidn,
            "email": dosen.email
        },
        "total_mengajar": len(jadwal_list),
        "data": jadwal_list
    }
