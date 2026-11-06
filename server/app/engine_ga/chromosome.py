from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import uuid

@dataclass
class Gene:
    kelas_id: uuid.UUID
    ruangan_id: uuid.UUID
    hari_id: int
    slot_mulai_id: uuid.UUID
    slot_mulai_nomor: int
    durasi_slot: int
    shift_kode: str = "PAGI"

    def slot_range(self) -> List[int]:
        """Daftar nomor slot yang digunakan sesi ini."""
        return list(range(self.slot_mulai_nomor, self.slot_mulai_nomor + self.durasi_slot))


@dataclass
class Violation:
    aturan_kode: str
    severity: str # "HARD" or "SOFT"
    penalti: float
    pesan: str
    detail: Dict[str, Any] = field(default_factory=dict)
    kelas_id: Optional[uuid.UUID] = None
    ruangan_id: Optional[uuid.UUID] = None
    hari_id: Optional[int] = None


@dataclass
class Chromosome:
    genes: List[Gene] = field(default_factory=list)
    fitness: float = 0.0
    hard_penalties: float = 0.0
    soft_penalties: float = 0.0
    hard_violations: List[Violation] = field(default_factory=list)
    soft_violations: List[Violation] = field(default_factory=list)

    @property
    def total_violations(self) -> int:
        return len(self.hard_violations) + len(self.soft_violations)

    @property
    def is_feasible(self) -> bool:
        """Kromosom layak (feasible) jika tidak ada satupun pelanggaran hard constraint."""
        return len(self.hard_violations) == 0

