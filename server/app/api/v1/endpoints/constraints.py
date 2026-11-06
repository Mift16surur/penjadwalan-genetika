from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from server.app.api.deps import get_db
from server.app.models import KetersediaanDosen, PreferensiDosen, AturanJadwal
from server.app.schemas.constraints import (
    KetersediaanDosenOut, KetersediaanDosenCreate,
    LecturerAvailabilityBulkPayload,
    PreferensiDosenOut, PreferensiDosenCreate,
    AturanJadwalOut
)

router = APIRouter()

# ----------------- KETERSEDIAAN DOSEN -----------------
@router.get("/lecturer-availabilities", response_model=List[KetersediaanDosenOut])
def get_availabilities(dosen_id: uuid.UUID = None, periode_id: uuid.UUID = None, db: Session = Depends(get_db)):
    query = db.query(KetersediaanDosen)
    if dosen_id:
        query = query.filter(KetersediaanDosen.dosen_id == dosen_id)
    if periode_id:
        query = query.filter(KetersediaanDosen.semester_periode_id == periode_id)
    return query.all()

@router.post("/lecturer-availabilities", response_model=KetersediaanDosenOut)
def create_availability(payload: KetersediaanDosenCreate, db: Session = Depends(get_db)):
    item = KetersediaanDosen(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.post("/lecturer-availabilities/bulk")
def save_bulk_availabilities(payload: LecturerAvailabilityBulkPayload, db: Session = Depends(get_db)):
    """Menyimpan seluruh matriks ketersediaan / jam sibuk dosen dalam satu kali submit."""
    # Hapus entri lama dosen ini pada semester aktif terkait
    db.query(KetersediaanDosen).filter(
        KetersediaanDosen.dosen_id == payload.dosen_id,
        KetersediaanDosen.semester_periode_id == payload.semester_periode_id
    ).delete()

    new_records = []
    for item in payload.items:
        # Jika dosen TIDAK BERSEDIA (tersedia == False)
        if not item.tersedia:
            rec = KetersediaanDosen(
                dosen_id=payload.dosen_id,
                semester_periode_id=payload.semester_periode_id,
                hari_id=item.hari_id,
                slot_mulai_id=item.slot_id,
                slot_selesai_id=item.slot_id,
                tersedia=False,
                keterangan="Jam sibuk / tidak bersedia mengajar"
            )
            new_records.append(rec)

    if new_records:
        db.add_all(new_records)
    db.commit()

    return {
        "status": "success",
        "message": f"Berhasil menyimpan {len(new_records)} slot waktu tidak bersedia untuk dosen tersebut.",
        "total_unavailable": len(new_records)
    }

# ----------------- PREFERENSI DOSEN -----------------
@router.get("/lecturer-preferences", response_model=List[PreferensiDosenOut])
def get_preferences(dosen_id: uuid.UUID = None, periode_id: uuid.UUID = None, db: Session = Depends(get_db)):
    query = db.query(PreferensiDosen)
    if dosen_id:
        query = query.filter(PreferensiDosen.dosen_id == dosen_id)
    if periode_id:
        query = query.filter(PreferensiDosen.semester_periode_id == periode_id)
    return query.all()

@router.post("/lecturer-preferences", response_model=PreferensiDosenOut)
def create_preference(payload: PreferensiDosenCreate, db: Session = Depends(get_db)):
    item = PreferensiDosen(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

# ----------------- ATURAN JADWAL (RULES & WEIGHTS) -----------------
@router.get("/rules", response_model=List[AturanJadwalOut])
def get_rules(db: Session = Depends(get_db)):
    return db.query(AturanJadwal).order_by(AturanJadwal.tipe.desc(), AturanJadwal.bobot.desc()).all()

@router.put("/rules/{rule_id}", response_model=AturanJadwalOut)
def update_rule_weight(rule_id: uuid.UUID, bobot: float, aktif: bool = True, db: Session = Depends(get_db)):
    rule = db.query(AturanJadwal).filter(AturanJadwal.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Aturan tidak ditemukan.")
    rule.bobot = bobot
    rule.aktif = aktif
    db.commit()
    db.refresh(rule)
    return rule

