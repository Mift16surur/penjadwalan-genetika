import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, SmallInteger, Float, ForeignKey, Enum, JSON, Text, Uuid
from sqlalchemy.orm import relationship
from server.app.core.database import Base
from server.app.models.enums import StatusJobGA, StatusVersiJadwal, StatusJadwal, SeverityPelanggaran

class JobGA(Base):
    """Riwayat & proses komputasi Algoritma Genetika."""
    __tablename__ = "job_ga"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    semester_periode_id = Column(Uuid(as_uuid=True), ForeignKey("semester_periode.id"), nullable=False)
    prodi_id = Column(Uuid(as_uuid=True), ForeignKey("prodi.id"), nullable=True)
    dibuat_oleh = Column(Uuid(as_uuid=True), nullable=True) # User ID BAA / Admin
    status = Column(Enum(StatusJobGA, native_enum=False), default=StatusJobGA.QUEUED, nullable=False)
    populasi = Column(Integer, default=100, nullable=False)
    generasi = Column(Integer, default=200, nullable=False)
    mutation_rate = Column(Float, default=0.05, nullable=False)
    crossover_rate = Column(Float, default=0.85, nullable=False)
    fitness_terbaik = Column(Float, nullable=True)
    progress = Column(Integer, default=0, nullable=False) # 0 - 100%
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    parameter = Column(JSON, default=dict)

    # Relationships
    semester_periode = relationship("SemesterPeriode", back_populates="job_ga_list")
    prodi = relationship("Prodi", back_populates="job_ga_list")
    versi_jadwal_list = relationship("VersiJadwal", back_populates="job_ga", cascade="all, delete-orphan")


class VersiJadwal(Base):
    """Kandidat hasil penjadwalan dari GA untuk direview, diedit, atau diapprove."""
    __tablename__ = "versi_jadwal"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_ga_id = Column(Uuid(as_uuid=True), ForeignKey("job_ga.id"), nullable=True)
    semester_periode_id = Column(Uuid(as_uuid=True), ForeignKey("semester_periode.id"), nullable=False)
    nomor_versi = Column(Integer, default=1, nullable=False)
    nama = Column(String(100), nullable=False) # e.g. "Kandidat 1 - Fitness 0.98", "Final Gasal 2026/2027"
    fitness_score = Column(Float, default=0.0, nullable=False)
    jumlah_pelanggaran = Column(Integer, default=0, nullable=False)
    status = Column(Enum(StatusVersiJadwal, native_enum=False), default=StatusVersiJadwal.DRAFT, nullable=False)
    dibuat_oleh = Column(Uuid(as_uuid=True), nullable=True)
    approved_by = Column(Uuid(as_uuid=True), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    job_ga = relationship("JobGA", back_populates="versi_jadwal_list")
    semester_periode = relationship("SemesterPeriode", back_populates="versi_jadwal_list")
    jadwal_list = relationship("Jadwal", back_populates="versi_jadwal", cascade="all, delete-orphan")
    pelanggaran_list = relationship("PelanggaranJadwal", back_populates="versi_jadwal", cascade="all, delete-orphan")


class Jadwal(Base):
    """Penempatan spesifik satu sesi kelas pada ruang, hari, dan slot waktu."""
    __tablename__ = "jadwal"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    versi_jadwal_id = Column(Uuid(as_uuid=True), ForeignKey("versi_jadwal.id"), nullable=False)
    kelas_id = Column(Uuid(as_uuid=True), ForeignKey("kelas.id"), nullable=False)
    ruangan_id = Column(Uuid(as_uuid=True), ForeignKey("ruangan.id"), nullable=False)
    hari_id = Column(SmallInteger, ForeignKey("hari.id"), nullable=False)
    slot_mulai_id = Column(Uuid(as_uuid=True), ForeignKey("slot_waktu.id"), nullable=False)
    durasi_slot = Column(Integer, default=2, nullable=False) # 2 atau 3 slot berurutan (100 - 150 menit)
    status = Column(Enum(StatusJadwal, native_enum=False), default=StatusJadwal.ACTIVE, nullable=False)
    fitness_score = Column(Float, nullable=True)
    manual_edit = Column(Boolean, default=False)
    catatan = Column(Text, nullable=True)

    # Relationships
    versi_jadwal = relationship("VersiJadwal", back_populates="jadwal_list")
    kelas = relationship("Kelas", back_populates="jadwal_list")
    ruangan = relationship("Ruangan", back_populates="jadwal_list")
    hari = relationship("Hari", back_populates="jadwal_list")
    slot_mulai = relationship("SlotWaktu", back_populates="jadwal_mulai_list")
    pelanggaran_list = relationship("PelanggaranJadwal", back_populates="jadwal")


class PelanggaranJadwal(Base):
    """Pencatatan pelanggaran hard/soft constraint yang ditemukan pada suatu versi jadwal."""
    __tablename__ = "pelanggaran_jadwal"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    versi_jadwal_id = Column(Uuid(as_uuid=True), ForeignKey("versi_jadwal.id"), nullable=False)
    jadwal_id = Column(Uuid(as_uuid=True), ForeignKey("jadwal.id"), nullable=True)
    aturan_id = Column(Uuid(as_uuid=True), ForeignKey("aturan_jadwal.id"), nullable=False)
    severity = Column(Enum(SeverityPelanggaran, native_enum=False), nullable=False)
    penalti = Column(Float, default=1.0, nullable=False)
    pesan = Column(Text, nullable=False)
    detail = Column(JSON, default=dict)

    # Relationships
    versi_jadwal = relationship("VersiJadwal", back_populates="pelanggaran_list")
    jadwal = relationship("Jadwal", back_populates="pelanggaran_list")
    aturan = relationship("AturanJadwal", back_populates="pelanggaran_list")

