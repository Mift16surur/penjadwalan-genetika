import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, Uuid
from sqlalchemy.orm import relationship
from server.app.core.database import Base

class PermohonanGantiJadwal(Base):
    """Pencatatan permohonan pergantian / penyesuaian jadwal kuliah oleh Dosen."""
    __tablename__ = "permohonan_ganti_jadwal"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jadwal_id = Column(Uuid(as_uuid=True), ForeignKey("jadwal.id"), nullable=False)
    dosen_id = Column(Uuid(as_uuid=True), ForeignKey("dosen.id"), nullable=False)
    
    # Target yang diusulkan
    ruangan_tujuan_id = Column(Uuid(as_uuid=True), ForeignKey("ruangan.id"), nullable=False)
    hari_tujuan_id = Column(Integer, ForeignKey("hari.id"), nullable=False)
    slot_tujuan_id = Column(Uuid(as_uuid=True), ForeignKey("slot_waktu.id"), nullable=False)
    
    alasan = Column(Text, nullable=False)
    status = Column(String(20), default="PENDING", nullable=False) # PENDING, APPROVED, REJECTED
    catatan_baak = Column(Text, nullable=True)
    diproses_oleh = Column(Uuid(as_uuid=True), nullable=True) # User ID Admin BAAK
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    jadwal = relationship("Jadwal")
    dosen = relationship("Dosen")
    ruangan_tujuan = relationship("Ruangan")
    hari_tujuan = relationship("Hari")
    slot_tujuan = relationship("SlotWaktu")

