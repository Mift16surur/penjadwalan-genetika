import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Enum, Uuid
from sqlalchemy.orm import relationship
from server.app.core.database import Base
from server.app.models.enums import JenisMataKuliah, StatusKelas, PeranDosen

class Fakultas(Base):
    __tablename__ = "fakultas"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kode = Column(String(20), unique=True, nullable=False, index=True)
    nama = Column(String(150), nullable=False)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    prodi_list = relationship("Prodi", back_populates="fakultas")
    ruangan_list = relationship("Ruangan", back_populates="fakultas")


class Prodi(Base):
    __tablename__ = "prodi"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fakultas_id = Column(Uuid(as_uuid=True), ForeignKey("fakultas.id"), nullable=False)
    kode = Column(String(20), unique=True, nullable=False, index=True)
    nama = Column(String(150), nullable=False)
    jenjang = Column(String(20), default="S1")
    aktif = Column(Boolean, default=True)

    # Relationships
    fakultas = relationship("Fakultas", back_populates="prodi_list")
    dosen_list = relationship("Dosen", back_populates="prodi")
    mata_kuliah_list = relationship("MataKuliah", back_populates="prodi")
    kelas_list = relationship("Kelas", back_populates="prodi")
    job_ga_list = relationship("JobGA", back_populates="prodi")


class Dosen(Base):
    __tablename__ = "dosen"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nidn = Column(String(30), unique=True, nullable=True, index=True)
    nip = Column(String(30), nullable=True)
    nama = Column(String(150), nullable=False)
    gelar_depan = Column(String(50), nullable=True)
    gelar_belakang = Column(String(100), nullable=True)
    email = Column(String(150), nullable=True)
    prodi_id = Column(Uuid(as_uuid=True), ForeignKey("prodi.id"), nullable=True)
    aktif = Column(Boolean, default=True)

    # Relationships
    prodi = relationship("Prodi", back_populates="dosen_list")
    pengampu_kelas_list = relationship("PengampuKelas", back_populates="dosen")
    ketersediaan_list = relationship("KetersediaanDosen", back_populates="dosen")
    preferensi_list = relationship("PreferensiDosen", back_populates="dosen")

    @property
    def nama_lengkap(self) -> str:
        depan = f"{self.gelar_depan} " if self.gelar_depan else ""
        belakang = f", {self.gelar_belakang}" if self.gelar_belakang else ""
        return f"{depan}{self.nama}{belakang}"


class MataKuliah(Base):
    __tablename__ = "mata_kuliah"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kode = Column(String(30), nullable=False, index=True)
    nama = Column(String(200), nullable=False)
    sks = Column(Integer, default=2, nullable=False)
    teori_sks = Column(Integer, default=2)
    praktik_sks = Column(Integer, default=0)
    jenis = Column(Enum(JenisMataKuliah, native_enum=False), default=JenisMataKuliah.TEORI, nullable=False)
    prodi_id = Column(Uuid(as_uuid=True), ForeignKey("prodi.id"), nullable=False)
    semester_rekomendasi = Column(Integer, default=1)
    aktif = Column(Boolean, default=True)

    # Relationships
    prodi = relationship("Prodi", back_populates="mata_kuliah_list")
    kurikulum_list = relationship("KurikulumMataKuliah", back_populates="mata_kuliah")
    kelas_list = relationship("Kelas", back_populates="mata_kuliah")


class KurikulumMataKuliah(Base):
    __tablename__ = "kurikulum_mata_kuliah"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mata_kuliah_id = Column(Uuid(as_uuid=True), ForeignKey("mata_kuliah.id"), nullable=False)
    prodi_id = Column(Uuid(as_uuid=True), ForeignKey("prodi.id"), nullable=False)
    semester_periode_id = Column(Uuid(as_uuid=True), ForeignKey("semester_periode.id"), nullable=False)
    semester_ke = Column(Integer, default=1)
    wajib = Column(Boolean, default=True)
    aktif = Column(Boolean, default=True)

    # Relationships
    mata_kuliah = relationship("MataKuliah", back_populates="kurikulum_list")


class Kelas(Base):
    """Kelas / Rombongan Belajar (Rombel) yang dijadwalkan oleh GA"""
    __tablename__ = "kelas"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kode_kelas = Column(String(30), nullable=False, index=True) # e.g. "TI-1A", "IF-3B"
    nama_kelas = Column(String(100), nullable=False)
    mata_kuliah_id = Column(Uuid(as_uuid=True), ForeignKey("mata_kuliah.id"), nullable=False)
    prodi_id = Column(Uuid(as_uuid=True), ForeignKey("prodi.id"), nullable=False)
    semester_periode_id = Column(Uuid(as_uuid=True), ForeignKey("semester_periode.id"), nullable=False)
    semester_ke = Column(Integer, default=1)
    jumlah_mahasiswa = Column(Integer, default=30, nullable=False)
    sks = Column(Integer, default=2, nullable=False)
    jenis = Column(Enum(JenisMataKuliah, native_enum=False), default=JenisMataKuliah.TEORI, nullable=False)
    status = Column(Enum(StatusKelas, native_enum=False), default=StatusKelas.ACTIVE, nullable=False)

    # Relationships
    mata_kuliah = relationship("MataKuliah", back_populates="kelas_list")
    prodi = relationship("Prodi", back_populates="kelas_list")
    semester_periode = relationship("SemesterPeriode", back_populates="kelas_list")
    pengampu_list = relationship("PengampuKelas", back_populates="kelas", cascade="all, delete-orphan")
    jadwal_list = relationship("Jadwal", back_populates="kelas")


class PengampuKelas(Base):
    """Relasi Banyak-ke-Banyak (N:M) Dosen dengan Kelas untuk mendukung Tim Teaching (92% di FSEH)"""
    __tablename__ = "pengampu_kelas"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kelas_id = Column(Uuid(as_uuid=True), ForeignKey("kelas.id"), nullable=False)
    dosen_id = Column(Uuid(as_uuid=True), ForeignKey("dosen.id"), nullable=False)
    peran = Column(Enum(PeranDosen, native_enum=False), default=PeranDosen.UTAMA, nullable=False)
    prioritas = Column(Integer, default=1)

    # Relationships
    kelas = relationship("Kelas", back_populates="pengampu_list")
    dosen = relationship("Dosen", back_populates="pengampu_kelas_list")

