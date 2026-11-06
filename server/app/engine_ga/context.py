from typing import Dict, List, Set, Any
import uuid
from sqlalchemy.orm import Session
from server.app.models import (
    Kelas, Ruangan, SlotWaktu, Hari, Shift, Dosen, PengampuKelas,
    AturanJadwal, KetersediaanDosen, PreferensiDosen
)
from server.app.models.enums import JenisRuangan, JenisMataKuliah

class GAContext:
    """Cache data akademik & aturan untuk komputasi cepat selama evolusi genetika."""

    def __init__(self, db: Session, semester_periode_id: uuid.UUID, prodi_id: uuid.UUID = None):
        self.db = db
        self.semester_periode_id = semester_periode_id
        self.prodi_id = prodi_id

        # 1. Load Kelas
        kelas_query = db.query(Kelas).filter(
            Kelas.semester_periode_id == semester_periode_id,
            Kelas.status == "ACTIVE"
        )
        if prodi_id:
            kelas_query = kelas_query.filter(Kelas.prodi_id == prodi_id)
        self.kelas_list: List[Kelas] = kelas_query.all()
        self.kelas_map: Dict[uuid.UUID, Kelas] = {k.id: k for k in self.kelas_list}

        # 2. Load Pengampu Kelas (Dosen per kelas)
        kelas_ids = [k.id for k in self.kelas_list]
        pengampu_list = db.query(PengampuKelas).filter(PengampuKelas.kelas_id.in_(kelas_ids)).all() if kelas_ids else []
        self.dosen_per_kelas: Dict[uuid.UUID, List[uuid.UUID]] = {}
        for p in pengampu_list:
            self.dosen_per_kelas.setdefault(p.kelas_id, []).append(p.dosen_id)

        # 3. Load Ruangan
        self.ruangan_list: List[Ruangan] = db.query(Ruangan).filter(Ruangan.aktif == True).all()
        self.ruangan_map: Dict[uuid.UUID, Ruangan] = {r.id: r for r in self.ruangan_list}
        self.lab_ruangan_ids: Set[uuid.UUID] = {r.id for r in self.ruangan_list if r.jenis == JenisRuangan.LABORATORIUM}
        self.teori_ruangan_ids: Set[uuid.UUID] = {r.id for r in self.ruangan_list if r.jenis in [JenisRuangan.KELAS, JenisRuangan.GAZEBO, JenisRuangan.AULA]}

        # 4. Load Hari & Slot Waktu
        self.hari_list: List[Hari] = db.query(Hari).order_by(Hari.id).all()
        self.hari_ids: List[int] = [h.id for h in self.hari_list]

        self.slot_list: List[SlotWaktu] = db.query(SlotWaktu).join(Shift).filter(
            SlotWaktu.aktif == True
        ).order_by(SlotWaktu.nomor).all()
        self.slot_map: Dict[uuid.UUID, SlotWaktu] = {s.id: s for s in self.slot_list}
        self.slots_by_shift: Dict[str, List[SlotWaktu]] = {}
        for s in self.slot_list:
            shift_kode = s.shift.kode
            self.slots_by_shift.setdefault(shift_kode, []).append(s)

        # Mapping nomor slot ke slot object
        self.slot_by_nomor: Dict[int, SlotWaktu] = {s.nomor: s for s in self.slot_list}

        # 5. Load Aturan & Bobot
        aturan_db = db.query(AturanJadwal).filter(AturanJadwal.aktif == True).all()
        self.aturan_map: Dict[str, AturanJadwal] = {a.kode: a for a in aturan_db}

        # 6. Load Ketersediaan Dosen (Unavailable slots)
        # Format: {(dosen_id, hari_id): set(slot_nomor)}
        self.dosen_unavailable: Dict[tuple, Set[int]] = {}
        avail_entries = db.query(KetersediaanDosen).filter(
            KetersediaanDosen.semester_periode_id == semester_periode_id,
            KetersediaanDosen.tersedia == False
        ).all()
        for av in avail_entries:
            mulai_no = self.slot_map[av.slot_mulai_id].nomor if av.slot_mulai_id in self.slot_map else 1
            selesai_no = self.slot_map[av.slot_selesai_id].nomor if av.slot_selesai_id in self.slot_map else mulai_no
            for s_no in range(mulai_no, selesai_no + 1):
                self.dosen_unavailable.setdefault((av.dosen_id, av.hari_id), set()).add(s_no)

        # 7. Load Preferensi Dosen
        self.dosen_preferences: List[PreferensiDosen] = db.query(PreferensiDosen).filter(
            PreferensiDosen.semester_periode_id == semester_periode_id
        ).all()

