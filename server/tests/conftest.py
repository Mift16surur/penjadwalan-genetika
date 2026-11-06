import os
import sys
# Ensure repository root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import pytest
import uuid
from datetime import time, date, datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from server.app.core.database import Base
from server.app.api.deps import get_db
from server.main import app
from server.app.models import (
    Fakultas, Prodi, Dosen, Ruangan, SemesterPeriode, Shift, Hari, SlotWaktu,
    MataKuliah, Kelas, PengampuKelas, AturanJadwal, User
)
from server.app.models.enums import (
    JenisRuangan, JenisMataKuliah, SemesterTipe, StatusPeriode, StatusKelas,
    PeranDosen, TipeAturan
)
from server.app.core.security import hash_password

# Use in-memory SQLite for high-speed, isolated unit tests
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def engine():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(engine):
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    # Seed basic master data
    seed_test_data(session)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def seed_test_data(db):
    # 1. Fakultas & Prodi
    fakultas = Fakultas(id=uuid.uuid4(), kode="FST", nama="Fakultas Sains dan Teknologi", aktif=True)
    db.add(fakultas)

    prodi = Prodi(id=uuid.uuid4(), fakultas_id=fakultas.id, kode="IF", nama="Informatika", jenjang="S1", aktif=True)
    db.add(prodi)

    # 2. Semester Periode
    periode = SemesterPeriode(
        id=uuid.uuid4(),
        kode="2026/2027-GASAL",
        tahun_ajaran="2026/2027",
        semester=SemesterTipe.GASAL,
        status=StatusPeriode.ACTIVE
    )
    db.add(periode)

    # 3. Shift & Hari & Slot
    shift = Shift(id=uuid.uuid4(), kode="PAGI", nama="Shift Reguler Pagi", jam_mulai=time(7, 30), jam_selesai=time(17, 10))
    db.add(shift)

    hari_senin = Hari(id=1, kode="SENIN", nama="Senin")
    hari_selasa = Hari(id=2, kode="SELASA", nama="Selasa")
    db.add_all([hari_senin, hari_selasa])

    slots = []
    for i in range(1, 9):
        s = SlotWaktu(
            id=uuid.uuid4(),
            shift_id=shift.id,
            nomor=i,
            jam_mulai=time(7 + i, 0),
            jam_selesai=time(7 + i, 50),
            durasi_menit=50,
            aktif=True
        )
        slots.append(s)
    db.add_all(slots)

    # 4. Ruangan
    r_teori = Ruangan(id=uuid.uuid4(), kode="RK-101", nama="Ruang Kelas 101", kapasitas=40, jenis=JenisRuangan.KELAS, aktif=True)
    r_lab = Ruangan(id=uuid.uuid4(), kode="LAB-KOM", nama="Lab Komputer 1", kapasitas=30, jenis=JenisRuangan.LABORATORIUM, aktif=True)
    db.add_all([r_teori, r_lab])

    # 5. Dosen
    dosen1 = Dosen(id=uuid.uuid4(), nidn="0412345601", nama="Budi Santoso", gelar_depan="Dr.", gelar_belakang="M.Kom.", aktif=True, prodi_id=prodi.id)
    dosen2 = Dosen(id=uuid.uuid4(), nidn="0412345602", nama="Siti Rahma", gelar_belakang="M.T.", aktif=True, prodi_id=prodi.id)
    db.add_all([dosen1, dosen2])

    # 6. Mata Kuliah & Kelas
    mk_teori = MataKuliah(id=uuid.uuid4(), kode="IF101", nama="Algoritma & Pemrograman", sks=3, jenis=JenisMataKuliah.TEORI, prodi_id=prodi.id)
    mk_praktik = MataKuliah(id=uuid.uuid4(), kode="IF102", nama="Praktikum Pemrograman", sks=2, jenis=JenisMataKuliah.PRAKTIK, prodi_id=prodi.id)
    db.add_all([mk_teori, mk_praktik])

    kelas1 = Kelas(
        id=uuid.uuid4(),
        kode_kelas="IF-1A",
        nama_kelas="Algoritma - Kelas 1A",
        mata_kuliah_id=mk_teori.id,
        prodi_id=prodi.id,
        semester_periode_id=periode.id,
        semester_ke=1,
        jumlah_mahasiswa=35,
        sks=3,
        jenis=JenisMataKuliah.TEORI,
        status=StatusKelas.ACTIVE
    )
    db.add(kelas1)

    pengampu1 = PengampuKelas(
        id=uuid.uuid4(),
        kelas_id=kelas1.id,
        dosen_id=dosen1.id,
        peran=PeranDosen.UTAMA
    )
    db.add(pengampu1)

    # 7. Aturan Jadwal
    aturan_list = [
        AturanJadwal(id=uuid.uuid4(), kode="HARD_NO_LECTURER_CLASH", nama="Dilarang Dosen Bentrok", tipe=TipeAturan.HARD, bobot=1000.0, aktif=True),
        AturanJadwal(id=uuid.uuid4(), kode="HARD_NO_ROOM_CLASH", nama="Dilarang Ruang Bentrok", tipe=TipeAturan.HARD, bobot=1000.0, aktif=True),
        AturanJadwal(id=uuid.uuid4(), kode="HARD_NO_CLASS_CLASH", nama="Dilarang Rombel Bentrok", tipe=TipeAturan.HARD, bobot=1000.0, aktif=True),
        AturanJadwal(id=uuid.uuid4(), kode="HARD_ROOM_CAPACITY", nama="Kapasitas Ruang Memadai", tipe=TipeAturan.HARD, bobot=500.0, aktif=True),
        AturanJadwal(id=uuid.uuid4(), kode="HARD_LAB_REQUIREMENT", nama="Praktikum Wajib di Laboratorium", tipe=TipeAturan.HARD, bobot=500.0, aktif=True),
        AturanJadwal(id=uuid.uuid4(), kode="HARD_LECTURER_AVAILABILITY", nama="Ketersediaan Waktu Dosen", tipe=TipeAturan.HARD, bobot=800.0, aktif=True),
    ]
    db.add_all(aturan_list)

    # 8. User Admin
    admin_user = User(
        id=uuid.uuid4(),
        username="admin",
        password_hash=hash_password("admin123"),
        nama_lengkap="Administrator BAAK",
        email="baak@unu.ac.id",
        role="BAAK",
        aktif=True
    )
    db.add(admin_user)

    db.commit()
