import uuid
from sqlalchemy import Column, String, Boolean, Integer, SmallInteger, Float, ForeignKey, Enum, JSON, Text, Uuid
from sqlalchemy.orm import relationship
from server.app.core.database import Base
from server.app.models.enums import TipePreferensi, TipeAturan

class KetersediaanDosen(Base):
    """Jadwal ketersediaan waktu dosen (Hard Constraint). Jika tersedia=False, GA tidak boleh memplot dosen pada slot tersebut."""
    __tablename__ = "ketersediaan_dosen"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dosen_id = Column(Uuid(as_uuid=True), ForeignKey("dosen.id"), nullable=False)
    semester_periode_id = Column(Uuid(as_uuid=True), ForeignKey("semester_periode.id"), nullable=False)
    hari_id = Column(SmallInteger, ForeignKey("hari.id"), nullable=False)
    slot_mulai_id = Column(Uuid(as_uuid=True), ForeignKey("slot_waktu.id"), nullable=False)
    slot_selesai_id = Column(Uuid(as_uuid=True), ForeignKey("slot_waktu.id"), nullable=False)
    tersedia = Column(Boolean, default=True, nullable=False)
    keterangan = Column(Text, nullable=True)

    # Relationships
    dosen = relationship("Dosen", back_populates="ketersediaan_list")
    semester_periode = relationship("SemesterPeriode", back_populates="ketersediaan_dosen_list")
    hari = relationship("Hari")
    slot_mulai = relationship("SlotWaktu", foreign_keys=[slot_mulai_id])
    slot_selesai = relationship("SlotWaktu", foreign_keys=[slot_selesai_id])


class PreferensiDosen(Base):
    """Preferensi dosen terkait hari/slot (Soft Constraint)."""
    __tablename__ = "preferensi_dosen"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dosen_id = Column(Uuid(as_uuid=True), ForeignKey("dosen.id"), nullable=False)
    semester_periode_id = Column(Uuid(as_uuid=True), ForeignKey("semester_periode.id"), nullable=False)
    hari_id = Column(SmallInteger, ForeignKey("hari.id"), nullable=True)
    slot_mulai_id = Column(Uuid(as_uuid=True), ForeignKey("slot_waktu.id"), nullable=True)
    slot_selesai_id = Column(Uuid(as_uuid=True), ForeignKey("slot_waktu.id"), nullable=True)
    tipe = Column(Enum(TipePreferensi, native_enum=False), default=TipePreferensi.PREFER, nullable=False)
    bobot = Column(Integer, default=5, nullable=False) # Skala 1-10
    keterangan = Column(Text, nullable=True)

    # Relationships
    dosen = relationship("Dosen", back_populates="preferensi_list")
    semester_periode = relationship("SemesterPeriode", back_populates="preferensi_dosen_list")
    hari = relationship("Hari")
    slot_mulai = relationship("SlotWaktu", foreign_keys=[slot_mulai_id])
    slot_selesai = relationship("SlotWaktu", foreign_keys=[slot_selesai_id])


class AturanJadwal(Base):
    """Aturan hard & soft constraint dan bobot penaltinya."""
    __tablename__ = "aturan_jadwal"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kode = Column(String(50), unique=True, nullable=False, index=True)
    nama = Column(String(150), nullable=False)
    tipe = Column(Enum(TipeAturan, native_enum=False), default=TipeAturan.HARD, nullable=False)
    bobot = Column(Float, default=100.0, nullable=False)
    aktif = Column(Boolean, default=True, nullable=False)
    konfigurasi = Column(JSON, default=dict)

    # Relationships
    pelanggaran_list = relationship("PelanggaranJadwal", back_populates="aturan")

