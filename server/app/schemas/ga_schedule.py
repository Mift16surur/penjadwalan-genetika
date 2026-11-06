from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
from server.app.models.enums import StatusJobGA, StatusVersiJadwal, StatusJadwal, SeverityPelanggaran
from server.app.schemas.schedule_master import RuanganOut, HariOut, SlotWaktuOut
from server.app.schemas.academic import KelasOut

class JobGACreate(BaseModel):
    semester_periode_id: uuid.UUID
    prodi_id: Optional[uuid.UUID] = None
    populasi: int = 50
    generasi: int = 100
    mutation_rate: float = 0.08
    crossover_rate: float = 0.85

class JobGAOut(BaseModel):
    id: uuid.UUID
    semester_periode_id: uuid.UUID
    prodi_id: Optional[uuid.UUID] = None
    status: StatusJobGA
    populasi: int
    generasi: int
    mutation_rate: float
    crossover_rate: float
    fitness_terbaik: Optional[float] = None
    progress: int
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PelanggaranJadwalOut(BaseModel):
    id: uuid.UUID
    aturan_id: uuid.UUID
    severity: SeverityPelanggaran
    penalti: float
    pesan: str
    detail: Dict[str, Any] = {}

    class Config:
        from_attributes = True


class JadwalItemOut(BaseModel):
    id: uuid.UUID
    versi_jadwal_id: uuid.UUID
    kelas_id: uuid.UUID
    ruangan_id: uuid.UUID
    hari_id: int
    slot_mulai_id: uuid.UUID
    durasi_slot: int
    status: StatusJadwal
    manual_edit: bool
    catatan: Optional[str] = None
    kelas: Optional[KelasOut] = None
    ruangan: Optional[RuanganOut] = None
    hari: Optional[HariOut] = None
    slot_mulai: Optional[SlotWaktuOut] = None

    class Config:
        from_attributes = True


class VersiJadwalOut(BaseModel):
    id: uuid.UUID
    job_ga_id: Optional[uuid.UUID] = None
    semester_periode_id: uuid.UUID
    nomor_versi: int
    nama: str
    fitness_score: float
    jumlah_pelanggaran: int
    status: StatusVersiJadwal
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VersiJadwalDetailOut(VersiJadwalOut):
    jadwal_list: List[JadwalItemOut] = []
    pelanggaran_list: List[PelanggaranJadwalOut] = []


class ScheduleAdjustRequest(BaseModel):
    ruangan_id: uuid.UUID
    hari_id: int
    slot_mulai_id: uuid.UUID

