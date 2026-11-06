import enum

class SemesterTipe(str, enum.Enum):
    GASAL = "GASAL"
    GENAP = "GENAP"

class StatusPeriode(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"

class JenisRuangan(str, enum.Enum):
    KELAS = "KELAS"
    LABORATORIUM = "LABORATORIUM"
    GAZEBO = "GAZEBO"
    AULA = "AULA"
    LAINNYA = "LAINNYA"

class JenisMataKuliah(str, enum.Enum):
    TEORI = "TEORI"
    PRAKTIK = "PRAKTIK"
    TEORI_PRAKTIK = "TEORI_PRAKTIK"

class StatusKelas(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"

class PeranDosen(str, enum.Enum):
    UTAMA = "UTAMA"
    ANGGOTA = "ANGGOTA"

class TipePreferensi(str, enum.Enum):
    PREFER = "PREFER"
    HINDARI = "HINDARI"

class TipeAturan(str, enum.Enum):
    HARD = "HARD"
    SOFT = "SOFT"

class StatusJobGA(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class StatusVersiJadwal(str, enum.Enum):
    DRAFT = "DRAFT"
    GENERATED = "GENERATED"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"

class StatusJadwal(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"

class SeverityPelanggaran(str, enum.Enum):
    HARD = "HARD"
    SOFT = "SOFT"

class AksiAudit(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    APPROVE = "APPROVE"
    PUBLISH = "PUBLISH"

