from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from server.app.api.deps import get_db
from server.app.models import Dosen, MataKuliah, Kelas, PengampuKelas
from server.app.models.enums import StatusKelas, JenisMataKuliah
from server.app.schemas.academic import (
    DosenOut, DosenCreate, DosenUpdate,
    MataKuliahOut, MataKuliahCreate, MataKuliahUpdate,
    KelasOut, KelasCreate, KelasUpdate
)

router = APIRouter()

# =====================================================================
# 1. DOSEN (CRUD, Soft Delete & Restore, Filter)
# =====================================================================
@router.get("/lecturers", response_model=List[DosenOut])
def get_lecturers(
    status: str = Query("active", description="Filter status: 'active', 'inactive', 'all'"),
    prodi_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Dosen)
    if status == "active":
        query = query.filter(Dosen.aktif == True)
    elif status == "inactive":
        query = query.filter(Dosen.aktif == False)

    if prodi_id:
        query = query.filter(Dosen.prodi_id == prodi_id)

    return query.order_by(Dosen.nama).all()

@router.post("/lecturers", response_model=DosenOut)
def create_lecturer(payload: DosenCreate, db: Session = Depends(get_db)):
    if payload.nidn:
        existing = db.query(Dosen).filter(Dosen.nidn == payload.nidn).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Dosen dengan NIDN '{payload.nidn}' sudah ada.")
    dosen = Dosen(**payload.model_dump())
    db.add(dosen)
    db.commit()
    db.refresh(dosen)
    return dosen

@router.put("/lecturers/{lecturer_id}", response_model=DosenOut)
def update_lecturer(lecturer_id: uuid.UUID, payload: DosenUpdate, db: Session = Depends(get_db)):
    dosen = db.query(Dosen).filter(Dosen.id == lecturer_id).first()
    if not dosen:
        raise HTTPException(status_code=404, detail="Dosen tidak ditemukan.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(dosen, field, val)

    db.commit()
    db.refresh(dosen)
    return dosen

@router.delete("/lecturers/{lecturer_id}")
def soft_delete_lecturer(lecturer_id: uuid.UUID, db: Session = Depends(get_db)):
    dosen = db.query(Dosen).filter(Dosen.id == lecturer_id).first()
    if not dosen:
        raise HTTPException(status_code=404, detail="Dosen tidak ditemukan.")
    dosen.aktif = False
    db.commit()
    return {"status": "success", "message": f"Dosen '{dosen.nama_lengkap}' berhasil dinonaktifkan (soft deleted)."}

@router.patch("/lecturers/{lecturer_id}/restore", response_model=DosenOut)
def restore_lecturer(lecturer_id: uuid.UUID, db: Session = Depends(get_db)):
    dosen = db.query(Dosen).filter(Dosen.id == lecturer_id).first()
    if not dosen:
        raise HTTPException(status_code=404, detail="Dosen tidak ditemukan.")
    dosen.aktif = True
    db.commit()
    db.refresh(dosen)
    return dosen


# =====================================================================
# 2. MATA KULIAH (CRUD, Soft Delete & Restore, Filter)
# =====================================================================
@router.get("/courses", response_model=List[MataKuliahOut])
def get_courses(
    status: str = Query("active", description="Filter status: 'active', 'inactive', 'all'"),
    jenis: Optional[JenisMataKuliah] = None,
    prodi_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MataKuliah)
    if status == "active":
        query = query.filter(MataKuliah.aktif == True)
    elif status == "inactive":
        query = query.filter(MataKuliah.aktif == False)

    if jenis:
        query = query.filter(MataKuliah.jenis == jenis)
    if prodi_id:
        query = query.filter(MataKuliah.prodi_id == prodi_id)

    return query.order_by(MataKuliah.kode).all()

@router.post("/courses", response_model=MataKuliahOut)
def create_course(payload: MataKuliahCreate, db: Session = Depends(get_db)):
    course = MataKuliah(**payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course

@router.put("/courses/{course_id}", response_model=MataKuliahOut)
def update_course(course_id: uuid.UUID, payload: MataKuliahUpdate, db: Session = Depends(get_db)):
    course = db.query(MataKuliah).filter(MataKuliah.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Mata kuliah tidak ditemukan.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(course, field, val)

    db.commit()
    db.refresh(course)
    return course

@router.delete("/courses/{course_id}")
def soft_delete_course(course_id: uuid.UUID, db: Session = Depends(get_db)):
    course = db.query(MataKuliah).filter(MataKuliah.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Mata kuliah tidak ditemukan.")
    course.aktif = False
    db.commit()
    return {"status": "success", "message": f"Mata kuliah '{course.nama}' berhasil dinonaktifkan (soft deleted)."}

@router.patch("/courses/{course_id}/restore", response_model=MataKuliahOut)
def restore_course(course_id: uuid.UUID, db: Session = Depends(get_db)):
    course = db.query(MataKuliah).filter(MataKuliah.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Mata kuliah tidak ditemukan.")
    course.aktif = True
    db.commit()
    db.refresh(course)
    return course


# =====================================================================
# 3. KELAS ROMBEL (CRUD, Soft Delete & Restore, Filter)
# =====================================================================
@router.get("/classes", response_model=List[KelasOut])
def get_classes(
    status: str = Query("active", description="Filter status: 'active', 'cancelled', 'all'"),
    periode_id: Optional[uuid.UUID] = None,
    prodi_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Kelas)
    if status == "active":
        query = query.filter(Kelas.status != StatusKelas.CANCELLED)
    elif status == "cancelled":
        query = query.filter(Kelas.status == StatusKelas.CANCELLED)

    if periode_id:
        query = query.filter(Kelas.semester_periode_id == periode_id)
    if prodi_id:
        query = query.filter(Kelas.prodi_id == prodi_id)

    return query.order_by(Kelas.kode_kelas).all()

@router.post("/classes", response_model=KelasOut)
def create_class(payload: KelasCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    dosen_ids = data.pop("dosen_ids", [])

    kelas = Kelas(**data)
    db.add(kelas)
    db.flush()

    for idx, d_id in enumerate(dosen_ids):
        pengampu = PengampuKelas(
            kelas_id=kelas.id,
            dosen_id=d_id,
            prioritas=idx + 1
        )
        db.add(pengampu)

    db.commit()
    db.refresh(kelas)
    return kelas

@router.put("/classes/{class_id}", response_model=KelasOut)
def update_class(class_id: uuid.UUID, payload: KelasUpdate, db: Session = Depends(get_db)):
    kelas = db.query(Kelas).filter(Kelas.id == class_id).first()
    if not kelas:
        raise HTTPException(status_code=404, detail="Kelas rombel tidak ditemukan.")

    update_data = payload.model_dump(exclude_unset=True)
    dosen_ids = update_data.pop("dosen_ids", None)

    for field, val in update_data.items():
        setattr(kelas, field, val)

    # Re-link pengampu if dosen_ids provided
    if dosen_ids is not None:
        db.query(PengampuKelas).filter(PengampuKelas.kelas_id == kelas.id).delete()
        for idx, d_id in enumerate(dosen_ids):
            db.add(PengampuKelas(kelas_id=kelas.id, dosen_id=d_id, prioritas=idx + 1))

    db.commit()
    db.refresh(kelas)
    return kelas

@router.delete("/classes/{class_id}")
def soft_delete_class(class_id: uuid.UUID, db: Session = Depends(get_db)):
    kelas = db.query(Kelas).filter(Kelas.id == class_id).first()
    if not kelas:
        raise HTTPException(status_code=404, detail="Kelas rombel tidak ditemukan.")
    kelas.status = StatusKelas.CANCELLED
    db.commit()
    return {"status": "success", "message": f"Kelas '{kelas.nama_kelas}' berhasil dibatalkan (soft deleted)."}

@router.patch("/classes/{class_id}/restore", response_model=KelasOut)
def restore_class(class_id: uuid.UUID, db: Session = Depends(get_db)):
    kelas = db.query(Kelas).filter(Kelas.id == class_id).first()
    if not kelas:
        raise HTTPException(status_code=404, detail="Kelas rombel tidak ditemukan.")
    kelas.status = StatusKelas.ACTIVE
    db.commit()
    db.refresh(kelas)
    return kelas
