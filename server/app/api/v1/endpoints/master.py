from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from server.app.api.deps import get_db
from server.app.models import Fakultas, Prodi, Ruangan, Shift, Hari, SlotWaktu, SemesterPeriode, Kelas
from server.app.models.enums import JenisRuangan, StatusPeriode
from server.app.schemas.academic import FakultasOut, ProdiOut, ProdiCreate, ProdiUpdate
from server.app.schemas.schedule_master import (
    RuanganOut, RuanganCreate, RuanganUpdate, ShiftOut, HariOut, SlotWaktuOut,
    SemesterPeriodeOut, SemesterPeriodeCreate, SemesterPeriodeUpdate
)

router = APIRouter()

# ----------------- SEMESTER PERIODE -----------------
@router.get("/periods", response_model=List[SemesterPeriodeOut])
def get_periods(db: Session = Depends(get_db)):
    return db.query(SemesterPeriode).order_by(SemesterPeriode.created_at.desc()).all()

@router.get("/periods/active", response_model=Optional[SemesterPeriodeOut])
def get_active_period(db: Session = Depends(get_db)):
    return db.query(SemesterPeriode).filter(SemesterPeriode.status == StatusPeriode.ACTIVE).first()

@router.post("/periods", response_model=SemesterPeriodeOut)
def create_period(payload: SemesterPeriodeCreate, db: Session = Depends(get_db)):
    kode = payload.kode.strip() if payload.kode else f"{payload.tahun_ajaran}-{payload.semester.value}"
    existing = db.query(SemesterPeriode).filter(SemesterPeriode.kode == kode).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Periode semester dengan kode '{kode}' sudah terdaftar.")

    # Jika diset ACTIVE langsung, arsipkan yang lain
    if payload.status == StatusPeriode.ACTIVE:
        db.query(SemesterPeriode).filter(SemesterPeriode.status == StatusPeriode.ACTIVE).update({
            SemesterPeriode.status: StatusPeriode.ARCHIVED
        })

    period = SemesterPeriode(
        kode=kode,
        tahun_ajaran=payload.tahun_ajaran.strip(),
        semester=payload.semester,
        tanggal_mulai=payload.tanggal_mulai,
        tanggal_selesai=payload.tanggal_selesai,
        status=payload.status
    )
    db.add(period)
    db.commit()
    db.refresh(period)
    return period

@router.put("/periods/{period_id}", response_model=SemesterPeriodeOut)
def update_period(period_id: uuid.UUID, payload: SemesterPeriodeUpdate, db: Session = Depends(get_db)):
    period = db.query(SemesterPeriode).filter(SemesterPeriode.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Periode semester tidak ditemukan.")

    if payload.status == StatusPeriode.ACTIVE and period.status != StatusPeriode.ACTIVE:
        db.query(SemesterPeriode).filter(SemesterPeriode.status == StatusPeriode.ACTIVE).update({
            SemesterPeriode.status: StatusPeriode.ARCHIVED
        })

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(period, field, value)

    db.commit()
    db.refresh(period)
    return period

@router.post("/periods/{period_id}/activate", response_model=SemesterPeriodeOut)
def activate_period(period_id: uuid.UUID, db: Session = Depends(get_db)):
    period = db.query(SemesterPeriode).filter(SemesterPeriode.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Periode semester tidak ditemukan.")

    # Arsipkan semua yang saat ini ACTIVE
    db.query(SemesterPeriode).filter(
        SemesterPeriode.status == StatusPeriode.ACTIVE,
        SemesterPeriode.id != period_id
    ).update({SemesterPeriode.status: StatusPeriode.ARCHIVED})

    period.status = StatusPeriode.ACTIVE
    db.commit()
    db.refresh(period)
    return period

@router.post("/periods/{period_id}/archive", response_model=SemesterPeriodeOut)
def archive_period(period_id: uuid.UUID, db: Session = Depends(get_db)):
    period = db.query(SemesterPeriode).filter(SemesterPeriode.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Periode semester tidak ditemukan.")

    period.status = StatusPeriode.ARCHIVED
    db.commit()
    db.refresh(period)
    return period

@router.delete("/periods/{period_id}")
def delete_period(period_id: uuid.UUID, db: Session = Depends(get_db)):
    period = db.query(SemesterPeriode).filter(SemesterPeriode.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Periode semester tidak ditemukan.")

    # Cek apakah periode ini sudah punya kelas / data
    class_count = db.query(Kelas).filter(Kelas.semester_periode_id == period_id).count()
    if class_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Periode ini tidak dapat dihapus karena memiliki {class_count} rombel kelas. Arsipkan periode ini saja."
        )

    db.delete(period)
    db.commit()
    return {"status": "success", "message": "Periode semester berhasil dihapus."}

# ----------------- FAKULTAS -----------------
@router.get("/faculties", response_model=List[FakultasOut])
def get_faculties(db: Session = Depends(get_db)):
    return db.query(Fakultas).filter(Fakultas.aktif == True).all()

# ----------------- PRODI (CRUD with Soft Delete & Filters) -----------------
@router.get("/departments", response_model=List[ProdiOut])
def get_departments(
    status: str = Query("active", description="Filter status: 'active', 'inactive', 'all'"),
    fakultas_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Prodi)
    if status == "active":
        query = query.filter(Prodi.aktif == True)
    elif status == "inactive":
        query = query.filter(Prodi.aktif == False)

    if fakultas_id:
        query = query.filter(Prodi.fakultas_id == fakultas_id)
    return query.order_by(Prodi.kode).all()

@router.post("/departments", response_model=ProdiOut)
def create_department(payload: ProdiCreate, db: Session = Depends(get_db)):
    existing = db.query(Prodi).filter(Prodi.kode == payload.kode).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Program Studi dengan kode '{payload.kode}' sudah ada.")
    prodi = Prodi(**payload.model_dump())
    db.add(prodi)
    db.commit()
    db.refresh(prodi)
    return prodi

@router.put("/departments/{prodi_id}", response_model=ProdiOut)
def update_department(prodi_id: uuid.UUID, payload: ProdiUpdate, db: Session = Depends(get_db)):
    prodi = db.query(Prodi).filter(Prodi.id == prodi_id).first()
    if not prodi:
        raise HTTPException(status_code=404, detail="Program Studi tidak ditemukan.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(prodi, field, val)

    db.commit()
    db.refresh(prodi)
    return prodi

@router.delete("/departments/{prodi_id}")
def soft_delete_department(prodi_id: uuid.UUID, db: Session = Depends(get_db)):
    prodi = db.query(Prodi).filter(Prodi.id == prodi_id).first()
    if not prodi:
        raise HTTPException(status_code=404, detail="Program Studi tidak ditemukan.")
    prodi.aktif = False
    db.commit()
    return {"status": "success", "message": f"Program Studi '{prodi.nama}' berhasil dinonaktifkan (soft deleted)."}

@router.patch("/departments/{prodi_id}/restore", response_model=ProdiOut)
def restore_department(prodi_id: uuid.UUID, db: Session = Depends(get_db)):
    prodi = db.query(Prodi).filter(Prodi.id == prodi_id).first()
    if not prodi:
        raise HTTPException(status_code=404, detail="Program Studi tidak ditemukan.")
    prodi.aktif = True
    db.commit()
    db.refresh(prodi)
    return prodi

# ----------------- RUANGAN (CRUD with Soft Delete & Filters) -----------------
@router.get("/rooms", response_model=List[RuanganOut])
def get_rooms(
    status: str = Query("active", description="Filter status: 'active', 'inactive', 'all'"),
    jenis: Optional[JenisRuangan] = None,
    gedung: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Mendapatkan daftar ruangan dengan filter status (aktif/terhapus), jenis ruangan, dan gedung."""
    query = db.query(Ruangan)
    if status == "active":
        query = query.filter(Ruangan.aktif == True)
    elif status == "inactive":
        query = query.filter(Ruangan.aktif == False)

    if jenis:
        query = query.filter(Ruangan.jenis == jenis)
    if gedung:
        query = query.filter(Ruangan.gedung.ilike(f"%{gedung}%"))

    return query.order_by(Ruangan.kode).all()

@router.post("/rooms", response_model=RuanganOut)
def create_room(payload: RuanganCreate, db: Session = Depends(get_db)):
    existing = db.query(Ruangan).filter(Ruangan.kode == payload.kode).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ruangan dengan kode '{payload.kode}' sudah ada.")
    room = Ruangan(**payload.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@router.put("/rooms/{room_id}", response_model=RuanganOut)
def update_room(room_id: uuid.UUID, payload: RuanganUpdate, db: Session = Depends(get_db)):
    room = db.query(Ruangan).filter(Ruangan.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Ruangan tidak ditemukan.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(room, field, val)

    db.commit()
    db.refresh(room)
    return room

@router.delete("/rooms/{room_id}")
def soft_delete_room(room_id: uuid.UUID, db: Session = Depends(get_db)):
    """Soft delete: mengubah status aktif ruangan menjadi False."""
    room = db.query(Ruangan).filter(Ruangan.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Ruangan tidak ditemukan.")
    room.aktif = False
    db.commit()
    return {"status": "success", "message": f"Ruangan '{room.nama}' berhasil dinonaktifkan (soft deleted)."}

@router.patch("/rooms/{room_id}/restore", response_model=RuanganOut)
def restore_room(room_id: uuid.UUID, db: Session = Depends(get_db)):
    """Mengembalikan status aktif ruangan menjadi True."""
    room = db.query(Ruangan).filter(Ruangan.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Ruangan tidak ditemukan.")
    room.aktif = True
    db.commit()
    db.refresh(room)
    return room

# ----------------- HARI, SHIFT, SLOT WAKTU -----------------
@router.get("/days", response_model=List[HariOut])
def get_days(db: Session = Depends(get_db)):
    return db.query(Hari).order_by(Hari.id).all()

@router.get("/shifts", response_model=List[ShiftOut])
def get_shifts(db: Session = Depends(get_db)):
    return db.query(Shift).filter(Shift.aktif == True).all()

@router.get("/time-slots", response_model=List[SlotWaktuOut])
def get_time_slots(db: Session = Depends(get_db)):
    return db.query(SlotWaktu).filter(SlotWaktu.aktif == True).order_by(SlotWaktu.nomor).all()

