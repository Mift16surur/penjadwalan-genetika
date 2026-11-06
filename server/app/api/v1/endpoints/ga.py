from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid

from server.app.api.deps import get_db
from server.app.core.database import SessionLocal
from server.app.models import (
    JobGA, VersiJadwal, Jadwal, PelanggaranJadwal, Kelas, Ruangan, SlotWaktu, Hari, Dosen
)
from server.app.models.enums import StatusJobGA, StatusVersiJadwal, StatusJadwal
from server.app.schemas.ga_schedule import (
    JobGACreate, JobGAOut, VersiJadwalOut, VersiJadwalDetailOut,
    JadwalItemOut, ScheduleAdjustRequest
)
from server.app.engine_ga.solver import execute_ga_job
from server.app.services.excel_service import export_schedule_to_excel

router = APIRouter()

def run_ga_in_background(job_id: uuid.UUID):
    db = SessionLocal()
    try:
        execute_ga_job(db, job_id)
    finally:
        db.close()


@router.post("/jobs", response_model=JobGAOut)
def trigger_ga_job(payload: JobGACreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Memulai proses penjadwalan otomatis menggunakan Algoritma Genetika di latar belakang."""
    job = JobGA(
        semester_periode_id=payload.semester_periode_id,
        prodi_id=payload.prodi_id,
        populasi=payload.populasi,
        generasi=payload.generasi,
        mutation_rate=payload.mutation_rate,
        crossover_rate=payload.crossover_rate,
        status=StatusJobGA.QUEUED
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Jalankan background task
    background_tasks.add_task(run_ga_in_background, job.id)
    return job


@router.get("/jobs/{job_id}", response_model=JobGAOut)
def get_job_status(job_id: uuid.UUID, db: Session = Depends(get_db)):
    job = db.query(JobGA).filter(JobGA.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job GA tidak ditemukan.")
    return job


@router.get("/versions", response_model=List[VersiJadwalOut])
def list_schedule_versions(periode_id: uuid.UUID = None, db: Session = Depends(get_db)):
    """Daftar versi/kandidat jadwal yang dihasilkan GA."""
    query = db.query(VersiJadwal)
    if periode_id:
        query = query.filter(VersiJadwal.semester_periode_id == periode_id)
    return query.order_by(VersiJadwal.created_at.desc()).all()


@router.get("/versions/{version_id}", response_model=VersiJadwalDetailOut)
def get_schedule_version_detail(version_id: uuid.UUID, db: Session = Depends(get_db)):
    """Mendapatkan detail penempatan jadwal dan daftar pelanggaran dari versi tertentu."""
    versi = db.query(VersiJadwal).filter(VersiJadwal.id == version_id).first()
    if not versi:
        raise HTTPException(status_code=404, detail="Versi jadwal tidak ditemukan.")
    return versi


@router.put("/items/{jadwal_id}/adjust", response_model=JadwalItemOut)
def adjust_schedule_item(jadwal_id: uuid.UUID, payload: ScheduleAdjustRequest, db: Session = Depends(get_db)):
    """
    Penyesuaian manual (drag-and-drop) posisi jadwal oleh admin.
    Mengecek potensi bentrok sebelum menyimpan.
    """
    item = db.query(Jadwal).filter(Jadwal.id == jadwal_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item jadwal tidak ditemukan.")

    ruang = db.query(Ruangan).filter(Ruangan.id == payload.ruangan_id).first()
    slot = db.query(SlotWaktu).filter(SlotWaktu.id == payload.slot_mulai_id).first()
    if not ruang or not slot:
        raise HTTPException(status_code=400, detail="Ruangan atau slot waktu tidak valid.")

    # Cek bentrok ruang pada versi jadwal yang sama
    target_slots = range(slot.nomor, slot.nomor + item.durasi_slot)
    existing_items = db.query(Jadwal).filter(
        Jadwal.versi_jadwal_id == item.versi_jadwal_id,
        Jadwal.id != item.id,
        Jadwal.ruangan_id == payload.ruangan_id,
        Jadwal.hari_id == payload.hari_id
    ).all()

    for other in existing_items:
        other_slot = db.query(SlotWaktu).filter(SlotWaktu.id == other.slot_mulai_id).first()
        if other_slot:
            other_range = range(other_slot.nomor, other_slot.nomor + other.durasi_slot)
            if any(s in other_range for s in target_slots):
                raise HTTPException(
                    status_code=409,
                    detail=f"Terjadi bentrok ruangan dengan kelas '{other.kelas.nama_kelas if other.kelas else 'Lain'}' pada slot yang sama!"
                )

    # Simpan perubahan
    item.ruangan_id = payload.ruangan_id
    item.hari_id = payload.hari_id
    item.slot_mulai_id = payload.slot_mulai_id
    item.manual_edit = True
    item.catatan = "Diubah manual oleh admin."
    db.commit()
    db.refresh(item)
    return item


@router.post("/versions/{version_id}/approve", response_model=VersiJadwalOut)
def approve_schedule_version(version_id: uuid.UUID, db: Session = Depends(get_db)):
    versi = db.query(VersiJadwal).filter(VersiJadwal.id == version_id).first()
    if not versi:
        raise HTTPException(status_code=404, detail="Versi jadwal tidak ditemukan.")
    versi.status = StatusVersiJadwal.APPROVED
    db.commit()
    db.refresh(versi)
    return versi


@router.post("/versions/{version_id}/publish", response_model=VersiJadwalOut)
def publish_schedule_version(version_id: uuid.UUID, db: Session = Depends(get_db)):
    versi = db.query(VersiJadwal).filter(VersiJadwal.id == version_id).first()
    if not versi:
        raise HTTPException(status_code=404, detail="Versi jadwal tidak ditemukan.")
    
    # Arsipkan versi lain yang sebelumnya PUBLISHED pada periode ini
    db.query(VersiJadwal).filter(
        VersiJadwal.semester_periode_id == versi.semester_periode_id,
        VersiJadwal.status == StatusVersiJadwal.PUBLISHED
    ).update({"status": StatusVersiJadwal.ARCHIVED})

    versi.status = StatusVersiJadwal.PUBLISHED
    db.commit()
    db.refresh(versi)
    return versi


@router.get("/versions/{version_id}/export-excel")
def export_version_excel(version_id: uuid.UUID, db: Session = Depends(get_db)):
    """Mengunduh hasil jadwal perkuliahan versi terpilih dalam format file Excel (.xlsx)."""
    try:
        stream = export_schedule_to_excel(db, version_id)
        versi = db.query(VersiJadwal).filter(VersiJadwal.id == version_id).first()
        filename = f"Jadwal_Kuliah_{versi.nama.replace(' ', '_')}.xlsx"
        return StreamingResponse(
            stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/versions/{version_id}/matrix")
def get_schedule_matrix(
    version_id: uuid.UUID,
    view_by: str = "room", # "room" | "lecturer" | "class"
    filter_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
    """
    Format matriks visualisasi jadwal yang langsung siap dirender oleh Frontend (FE).
    Mendukung 3 perspektif:
    1. view_by=room (Grid Hari x Jam per Ruangan)
    2. view_by=lecturer (Jadwal per Dosen)
    3. view_by=class (Jadwal per Rombel Mahasiswa)
    """
    versi = db.query(VersiJadwal).filter(VersiJadwal.id == version_id).first()
    if not versi:
        raise HTTPException(status_code=404, detail="Versi jadwal tidak ditemukan.")

    hari_list = db.query(Hari).order_by(Hari.id).all()
    slots = db.query(SlotWaktu).filter(SlotWaktu.aktif == True).order_by(SlotWaktu.nomor).all()

    # Siapkan kolom berdasarkan perspektif view_by
    columns = []
    if view_by == "room":
        q = db.query(Ruangan).filter(Ruangan.aktif == True)
        if filter_id:
            q = q.filter(Ruangan.id == filter_id)
        rooms = q.order_by(Ruangan.kode).all()
        columns = [{"id": str(r.id), "kode": r.kode, "nama": r.nama, "kapasitas": r.kapasitas, "jenis": r.jenis.value} for r in rooms]
    elif view_by == "lecturer":
        q = db.query(Dosen).filter(Dosen.aktif == True)
        if filter_id:
            q = q.filter(Dosen.id == filter_id)
        lecturers = q.order_by(Dosen.nama).all()
        columns = [{"id": str(d.id), "kode": d.nidn or "-", "nama": d.nama_lengkap} for d in lecturers]
    elif view_by == "class":
        q = db.query(Kelas).filter(Kelas.semester_periode_id == versi.semester_periode_id)
        if filter_id:
            q = q.filter(Kelas.id == filter_id)
        classes = q.order_by(Kelas.kode_kelas).all()
        columns = [{"id": str(c.id), "kode": c.kode_kelas, "nama": c.nama_kelas, "sks": c.sks} for c in classes]

    # Map jadwal item ke cells
    # Key: "{column_id}_{hari_id}_{slot_nomor}"
    cells: Dict[str, Any] = {}
    for item in versi.jadwal_list:
        dosen_names = ", ".join([p.dosen.nama_lengkap for p in item.kelas.pengampu_list if p.dosen]) if item.kelas else ""
        item_data = {
            "jadwal_id": str(item.id),
            "kelas_id": str(item.kelas_id),
            "kode_kelas": item.kelas.kode_kelas if item.kelas else "",
            "nama_kelas": item.kelas.nama_kelas if item.kelas else "",
            "sks": item.kelas.sks if item.kelas else 2,
            "dosen": dosen_names,
            "ruangan_id": str(item.ruangan_id),
            "nama_ruang": item.ruangan.nama if item.ruangan else "",
            "hari_id": item.hari_id,
            "hari_nama": item.hari.nama if item.hari else "",
            "slot_mulai_nomor": item.slot_mulai.nomor if item.slot_mulai else 1,
            "durasi_slot": item.durasi_slot,
            "manual_edit": item.manual_edit
        }

        # Tentukan column_id pemetaan
        col_ids = []
        if view_by == "room":
            col_ids = [str(item.ruangan_id)]
        elif view_by == "lecturer":
            col_ids = [str(p.dosen_id) for p in item.kelas.pengampu_list if p.dosen_id] if item.kelas else []
        elif view_by == "class":
            col_ids = [str(item.kelas_id)]

        start_no = item.slot_mulai.nomor if item.slot_mulai else 1
        for cid in col_ids:
            for s_offset in range(item.durasi_slot):
                s_no = start_no + s_offset
                cell_key = f"{cid}_{item.hari_id}_{s_no}"
                cells[cell_key] = {
                    **item_data,
                    "is_start": s_offset == 0
                }

    return {
        "version_id": str(versi.id),
        "version_name": versi.nama,
        "fitness_score": versi.fitness_score,
        "total_violations": versi.jumlah_pelanggaran,
        "view_by": view_by,
        "columns": columns,
        "days": [{"id": h.id, "kode": h.kode, "nama": h.nama} for h in hari_list],
        "time_slots": [
            {
                "id": str(s.id),
                "nomor": s.nomor,
                "jam_mulai": s.jam_mulai.strftime("%H:%M"),
                "jam_selesai": s.jam_selesai.strftime("%H:%M"),
                "shift": s.shift.nama if s.shift else ""
            } for s in slots
        ],
        "cells": cells
    }


