import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Date, Time, Integer, SmallInteger, ForeignKey, Enum, JSON, Uuid
from sqlalchemy.orm import relationship
from server.app.core.database import Base
from server.app.models.enums import SemesterTipe, StatusPeriode, JenisRuangan

class SemesterPeriode(Base):
    __tablename__ = "semester_periode"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kode = Column(String(30), unique=True, nullable=False, index=True)
    tahun_ajaran = Column(String(20), nullable=False)
    semester = Column(Enum(SemesterTipe, native_enum=False), nullable=False)
    tanggal_mulai = Column(Date, nullable=True)
    tanggal_selesai = Column(Date, nullable=True)
    status = Column(Enum(StatusPeriode, native_enum=False), default=StatusPeriode.DRAFT, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    kelas_list = relationship("Kelas", back_populates="semester_periode")
    ketersediaan_dosen_list = relationship("KetersediaanDosen", back_populates="semester_periode")
    preferensi_dosen_list = relationship("PreferensiDosen", back_populates="semester_periode")
    job_ga_list = relationship("JobGA", back_populates="semester_periode")
    versi_jadwal_list = relationship("VersiJadwal", back_populates="semester_periode")


class Ruangan(Base):
    __tablename__ = "ruangan"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kode = Column(String(30), unique=True, nullable=False, index=True)
    nama = Column(String(150), nullable=False)
    gedung = Column(String(100), nullable=True)
    lantai = Column(Integer, default=1)
    kapasitas = Column(Integer, nullable=False, default=40)
    jenis = Column(Enum(JenisRuangan, native_enum=False), default=JenisRuangan.KELAS, nullable=False)
    fasilitas = Column(JSON, default=dict)
    fakultas_id = Column(Uuid(as_uuid=True), ForeignKey("fakultas.id"), nullable=True)
    dapat_digunakan_bersama = Column(Boolean, default=True)
    aktif = Column(Boolean, default=True)

    # Relationships
    fakultas = relationship("Fakultas", back_populates="ruangan_list")
    jadwal_list = relationship("Jadwal", back_populates="ruangan")


class Shift(Base):
    __tablename__ = "shift"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kode = Column(String(20), unique=True, nullable=False)
    nama = Column(String(50), nullable=False)
    jam_mulai = Column(Time, nullable=False)
    jam_selesai = Column(Time, nullable=False)
    aktif = Column(Boolean, default=True)

    # Relationships
    slot_waktu_list = relationship("SlotWaktu", back_populates="shift", cascade="all, delete-orphan")


class Hari(Base):
    __tablename__ = "hari"

    id = Column(SmallInteger, primary_key=True)  # 1: Senin, 2: Selasa, ... 6: Sabtu
    kode = Column(String(10), unique=True, nullable=False)
    nama = Column(String(20), nullable=False)

    # Relationships
    jadwal_list = relationship("Jadwal", back_populates="hari")


class SlotWaktu(Base):
    __tablename__ = "slot_waktu"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shift_id = Column(Uuid(as_uuid=True), ForeignKey("shift.id"), nullable=False)
    nomor = Column(Integer, nullable=False)
    jam_mulai = Column(Time, nullable=False)
    jam_selesai = Column(Time, nullable=False)
    durasi_menit = Column(Integer, default=50, nullable=False)
    aktif = Column(Boolean, default=True)

    # Relationships
    shift = relationship("Shift", back_populates="slot_waktu_list")
    jadwal_mulai_list = relationship("Jadwal", back_populates="slot_mulai")

