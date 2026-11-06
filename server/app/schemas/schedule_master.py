from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import time, date, datetime
import uuid
from server.app.models.enums import SemesterTipe, StatusPeriode, JenisRuangan

class SemesterPeriodeBase(BaseModel):
    kode: str
    tahun_ajaran: str
    semester: SemesterTipe
    tanggal_mulai: Optional[date] = None
    tanggal_selesai: Optional[date] = None
    status: StatusPeriode = StatusPeriode.DRAFT

class SemesterPeriodeOut(SemesterPeriodeBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SemesterPeriodeCreate(BaseModel):
    kode: Optional[str] = None
    tahun_ajaran: str
    semester: SemesterTipe
    tanggal_mulai: Optional[date] = None
    tanggal_selesai: Optional[date] = None
    status: StatusPeriode = StatusPeriode.DRAFT

class SemesterPeriodeUpdate(BaseModel):
    tahun_ajaran: Optional[str] = None
    semester: Optional[SemesterTipe] = None
    tanggal_mulai: Optional[date] = None
    tanggal_selesai: Optional[date] = None
    status: Optional[StatusPeriode] = None


class RuanganBase(BaseModel):
    kode: str
    nama: str
    gedung: Optional[str] = None
    lantai: int = 1
    kapasitas: int = 40
    jenis: JenisRuangan = JenisRuangan.KELAS
    fasilitas: Dict[str, Any] = {}
    fakultas_id: Optional[uuid.UUID] = None
    dapat_digunakan_bersama: bool = True
    aktif: bool = True

class RuanganCreate(RuanganBase):
    pass

class RuanganUpdate(BaseModel):
    kode: Optional[str] = None
    nama: Optional[str] = None
    gedung: Optional[str] = None
    lantai: Optional[int] = None
    kapasitas: Optional[int] = None
    jenis: Optional[JenisRuangan] = None
    aktif: Optional[bool] = None

class RuanganOut(RuanganBase):
    id: uuid.UUID

    class Config:
        from_attributes = True


class SlotWaktuOut(BaseModel):
    id: uuid.UUID
    shift_id: uuid.UUID
    nomor: int
    jam_mulai: time
    jam_selesai: time
    durasi_menit: int
    aktif: bool

    class Config:
        from_attributes = True


class ShiftOut(BaseModel):
    id: uuid.UUID
    kode: str
    nama: str
    jam_mulai: time
    jam_selesai: time
    aktif: bool
    slot_waktu_list: List[SlotWaktuOut] = []

    class Config:
        from_attributes = True


class HariOut(BaseModel):
    id: int
    kode: str
    nama: str

    class Config:
        from_attributes = True

