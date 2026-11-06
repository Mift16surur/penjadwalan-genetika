from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime
from server.app.models.enums import JenisMataKuliah, StatusKelas, PeranDosen

class FakultasBase(BaseModel):
    kode: str
    nama: str
    aktif: bool = True

class FakultasOut(FakultasBase):
    id: uuid.UUID
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProdiBase(BaseModel):
    fakultas_id: uuid.UUID
    kode: str
    nama: str
    jenjang: str = "S1"
    aktif: bool = True

class ProdiCreate(ProdiBase):
    pass

class ProdiUpdate(BaseModel):
    fakultas_id: Optional[uuid.UUID] = None
    kode: Optional[str] = None
    nama: Optional[str] = None
    jenjang: Optional[str] = None
    aktif: Optional[bool] = None

class ProdiOut(ProdiBase):
    id: uuid.UUID
    fakultas: Optional[FakultasOut] = None

    class Config:
        from_attributes = True


class DosenBase(BaseModel):
    nidn: Optional[str] = None
    nip: Optional[str] = None
    nama: str
    gelar_depan: Optional[str] = None
    gelar_belakang: Optional[str] = None
    email: Optional[str] = None
    prodi_id: Optional[uuid.UUID] = None
    aktif: bool = True

class DosenCreate(DosenBase):
    pass

class DosenUpdate(BaseModel):
    nidn: Optional[str] = None
    nip: Optional[str] = None
    nama: Optional[str] = None
    gelar_depan: Optional[str] = None
    gelar_belakang: Optional[str] = None
    email: Optional[str] = None
    prodi_id: Optional[uuid.UUID] = None
    aktif: Optional[bool] = None

class DosenOut(DosenBase):
    id: uuid.UUID
    nama_lengkap: str

    class Config:
        from_attributes = True


class MataKuliahBase(BaseModel):
    kode: str
    nama: str
    sks: int = 2
    teori_sks: int = 2
    praktik_sks: int = 0
    jenis: JenisMataKuliah = JenisMataKuliah.TEORI
    prodi_id: uuid.UUID
    semester_rekomendasi: int = 1
    aktif: bool = True

class MataKuliahCreate(MataKuliahBase):
    pass

class MataKuliahUpdate(BaseModel):
    kode: Optional[str] = None
    nama: Optional[str] = None
    sks: Optional[int] = None
    teori_sks: Optional[int] = None
    praktik_sks: Optional[int] = None
    jenis: Optional[JenisMataKuliah] = None
    prodi_id: Optional[uuid.UUID] = None
    semester_rekomendasi: Optional[int] = None
    aktif: Optional[bool] = None

class MataKuliahOut(MataKuliahBase):
    id: uuid.UUID

    class Config:
        from_attributes = True


class PengampuKelasOut(BaseModel):
    id: uuid.UUID
    dosen_id: uuid.UUID
    peran: PeranDosen
    prioritas: int
    dosen: Optional[DosenOut] = None

    class Config:
        from_attributes = True


class KelasBase(BaseModel):
    kode_kelas: str
    nama_kelas: str
    mata_kuliah_id: uuid.UUID
    prodi_id: uuid.UUID
    semester_periode_id: uuid.UUID
    semester_ke: int = 1
    jumlah_mahasiswa: int = 30
    sks: int = 2
    jenis: JenisMataKuliah = JenisMataKuliah.TEORI
    status: StatusKelas = StatusKelas.ACTIVE

class KelasCreate(KelasBase):
    dosen_ids: List[uuid.UUID] = []

class KelasUpdate(BaseModel):
    kode_kelas: Optional[str] = None
    nama_kelas: Optional[str] = None
    mata_kuliah_id: Optional[uuid.UUID] = None
    prodi_id: Optional[uuid.UUID] = None
    semester_periode_id: Optional[uuid.UUID] = None
    semester_ke: Optional[int] = None
    jumlah_mahasiswa: Optional[int] = None
    sks: Optional[int] = None
    jenis: Optional[JenisMataKuliah] = None
    status: Optional[StatusKelas] = None
    dosen_ids: Optional[List[uuid.UUID]] = None

class KelasOut(KelasBase):
    id: uuid.UUID
    pengampu_list: List[PengampuKelasOut] = []
    mata_kuliah: Optional[MataKuliahOut] = None

    class Config:
        from_attributes = True

