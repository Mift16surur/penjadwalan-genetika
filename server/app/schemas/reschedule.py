from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

class RescheduleRequestCreate(BaseModel):
    jadwal_id: uuid.UUID
    dosen_id: uuid.UUID
    nidn_verification: str
    ruangan_tujuan_id: uuid.UUID
    hari_tujuan_id: int
    slot_tujuan_id: uuid.UUID
    alasan: str

class RescheduleReviewAction(BaseModel):
    status: str # APPROVED or REJECTED
    catatan_baak: Optional[str] = None

class AvailableSlotItem(BaseModel):
    hari_id: int
    hari_nama: str
    slot_id: uuid.UUID
    slot_nomor: int
    jam_mulai: str
    jam_selesai: str
    ruangan_id: uuid.UUID
    ruangan_kode: str
    ruangan_nama: str
    ruangan_gedung: Optional[str] = None
    kapasitas: int
    jenis: str

class PermohonanGantiJadwalOut(BaseModel):
    id: uuid.UUID
    jadwal_id: uuid.UUID
    dosen_id: uuid.UUID
    dosen_nama: str
    dosen_nidn: Optional[str] = None
    mata_kuliah_nama: str
    mata_kuliah_kode: str
    kelas_nama: str
    kelas_kode: str
    sks: int
    
    # Asal
    hari_asal: str
    jam_asal: str
    ruangan_asal: str
    
    # Tujuan
    hari_tujuan_id: int
    hari_tujuan: str
    slot_tujuan_id: uuid.UUID
    jam_tujuan: str
    ruangan_tujuan_id: uuid.UUID
    ruangan_tujuan: str
    ruangan_tujuan_gedung: Optional[str] = None
    
    alasan: str
    status: str
    catatan_baak: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

