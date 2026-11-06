from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uuid
from server.app.models.enums import TipePreferensi, TipeAturan

class KetersediaanDosenBase(BaseModel):
    dosen_id: uuid.UUID
    semester_periode_id: uuid.UUID
    hari_id: int
    slot_mulai_id: uuid.UUID
    slot_selesai_id: uuid.UUID
    tersedia: bool = True
    keterangan: Optional[str] = None

class KetersediaanDosenCreate(KetersediaanDosenBase):
    pass

class KetersediaanDosenOut(KetersediaanDosenBase):
    id: uuid.UUID

    class Config:
        from_attributes = True


class LecturerAvailabilityBulkItem(BaseModel):
    hari_id: int
    slot_id: uuid.UUID
    tersedia: bool = True

class LecturerAvailabilityBulkPayload(BaseModel):
    dosen_id: uuid.UUID
    semester_periode_id: uuid.UUID
    items: List[LecturerAvailabilityBulkItem]


class PreferensiDosenBase(BaseModel):
    dosen_id: uuid.UUID
    semester_periode_id: uuid.UUID
    hari_id: Optional[int] = None
    slot_mulai_id: Optional[uuid.UUID] = None
    slot_selesai_id: Optional[uuid.UUID] = None
    tipe: TipePreferensi = TipePreferensi.PREFER
    bobot: int = 5
    keterangan: Optional[str] = None

class PreferensiDosenCreate(PreferensiDosenBase):
    pass

class PreferensiDosenOut(PreferensiDosenBase):
    id: uuid.UUID

    class Config:
        from_attributes = True


class AturanJadwalBase(BaseModel):
    kode: str
    nama: str
    tipe: TipeAturan
    bobot: float
    aktif: bool = True
    konfigurasi: Dict[str, Any] = {}

class AturanJadwalOut(AturanJadwalBase):
    id: uuid.UUID

    class Config:
        from_attributes = True

