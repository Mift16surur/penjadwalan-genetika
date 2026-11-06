import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, JSON, Uuid
from server.app.core.database import Base
from server.app.models.enums import AksiAudit

class AuditLog(Base):
    """Pencatatan jejak audit (aktivitas sistem, approval, perubahan manual)."""
    __tablename__ = "audit_log"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid(as_uuid=True), nullable=True)
    aksi = Column(Enum(AksiAudit, native_enum=False), nullable=False)
    entitas = Column(String(100), nullable=False)
    entitas_id = Column(Uuid(as_uuid=True), nullable=True)
    data_lama = Column(JSON, nullable=True)
    data_baru = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

