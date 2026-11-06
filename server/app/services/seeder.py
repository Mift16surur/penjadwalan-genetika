from datetime import time, date
from sqlalchemy.orm import Session
from server.app.models import (
    Fakultas, Prodi, Ruangan, Shift, Hari, SlotWaktu,
    SemesterPeriode, AturanJadwal, Dosen, MataKuliah, Kelas, PengampuKelas
)
from server.app.models.enums import (
    SemesterTipe, StatusPeriode, JenisRuangan, JenisMataKuliah,
    PeranDosen, TipeAturan, StatusKelas
)

def seed_master_data(db: Session):
    """Seed data master dasar: Admin User, Hari, Shift, Slot Waktu, Aturan Jadwal, Fakultas, dan Ruangan."""
    
    # 0. Seed Default Admin User
    from server.app.models.user import User
    from server.app.core.security import hash_password

    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_user = User(
            username="admin",
            email="admin.baak@unu.ac.id",
            password_hash=hash_password("admin123"),
            nama_lengkap="Administrator BAAK UNU",
            role="SUPERADMIN",
            aktif=True
        )
        db.add(admin_user)
        db.commit()

    # 1. Seed Hari (1: Senin s/d 6: Sabtu)
    hari_data = [
        (1, "SEN", "Senin"),
        (2, "SEL", "Selasa"),
        (3, "RAB", "Rabu"),
        (4, "KAM", "Kamis"),
        (5, "JUM", "Jumat"),
        (6, "SAB", "Sabtu"),
    ]
    for h_id, h_kode, h_nama in hari_data:
        existing = db.query(Hari).filter(Hari.id == h_id).first()
        if not existing:
            db.add(Hari(id=h_id, kode=h_kode, nama=h_nama))
    db.commit()

    # 2. Seed Shift (Pagi & Malam)
    shift_pagi = db.query(Shift).filter(Shift.kode == "PAGI").first()
    if not shift_pagi:
        shift_pagi = Shift(
            kode="PAGI",
            nama="Shift Pagi",
            jam_mulai=time(7, 30),
            jam_selesai=time(16, 20),
            aktif=True
        )
        db.add(shift_pagi)
        db.flush()

    shift_malam = db.query(Shift).filter(Shift.kode == "MALAM").first()
    if not shift_malam:
        shift_malam = Shift(
            kode="MALAM",
            nama="Shift Malam",
            jam_mulai=time(16, 20),
            jam_selesai=time(21, 0),
            aktif=True
        )
        db.add(shift_malam)
        db.flush()
    db.commit()

    # 3. Seed Slot Waktu 50 menit
    slots_pagi = [
        (1, time(7, 30), time(8, 20)),
        (2, time(8, 20), time(9, 10)),
        (3, time(9, 10), time(10, 0)),
        (4, time(10, 0), time(10, 50)),
        (5, time(10, 50), time(11, 40)),
        # Jeda Sholat / Istirahat Siang 11:40 - 13:00
        (6, time(13, 0), time(13, 50)),
        (7, time(13, 50), time(14, 40)),
        (8, time(14, 40), time(15, 30)),
        (9, time(15, 30), time(16, 20)),
    ]
    for nomor, mulai, selesai in slots_pagi:
        existing = db.query(SlotWaktu).filter(
            SlotWaktu.shift_id == shift_pagi.id,
            SlotWaktu.nomor == nomor
        ).first()
        if not existing:
            db.add(SlotWaktu(
                shift_id=shift_pagi.id,
                nomor=nomor,
                jam_mulai=mulai,
                jam_selesai=selesai,
                durasi_menit=50
            ))

    slots_malam = [
        (10, time(16, 20), time(17, 10)),
        (11, time(17, 10), time(18, 0)),
        # Jeda Sholat Maghrib
        (12, time(18, 30), time(19, 20)),
        (13, time(19, 20), time(20, 10)),
        (14, time(20, 10), time(21, 0)),
    ]
    for nomor, mulai, selesai in slots_malam:
        existing = db.query(SlotWaktu).filter(
            SlotWaktu.shift_id == shift_malam.id,
            SlotWaktu.nomor == nomor
        ).first()
        if not existing:
            db.add(SlotWaktu(
                shift_id=shift_malam.id,
                nomor=nomor,
                jam_mulai=mulai,
                jam_selesai=selesai,
                durasi_menit=50
            ))
    db.commit()

    # 4. Seed Aturan Jadwal (Hard & Soft Constraints)
    aturan_list = [
        # Hard Constraints
        ("HARD_NO_LECTURER_CLASH", "Dosen tidak boleh mengajar lebih dari 1 kelas di waktu yang sama", TipeAturan.HARD, 1000.0),
        ("HARD_NO_ROOM_CLASH", "Ruangan tidak boleh digunakan lebih dari 1 kelas di waktu yang sama", TipeAturan.HARD, 1000.0),
        ("HARD_NO_CLASS_CLASH", "Rombel mahasiswa tidak boleh memiliki lebih dari 1 kuliah di waktu yang sama", TipeAturan.HARD, 1000.0),
        ("HARD_ROOM_CAPACITY", "Kapasitas ruangan harus mencukupi jumlah mahasiswa peserta kelas", TipeAturan.HARD, 500.0),
        ("HARD_LAB_REQUIREMENT", "Mata kuliah praktikum wajib ditempatkan di Laboratorium", TipeAturan.HARD, 500.0),
        ("HARD_LECTURER_AVAILABILITY", "Kuliah harus dijadwalkan pada waktu ketersediaan dosen", TipeAturan.HARD, 800.0),
        # Soft Constraints
        ("SOFT_DAY_SPREAD", "Sebaran jadwal perkuliahan merata sepanjang hari (tidak menumpuk di Kamis)", TipeAturan.SOFT, 10.0),
        ("SOFT_LECTURER_GAP", "Dosen memiliki jeda istirahat yang cukup antar sesi mengajar", TipeAturan.SOFT, 15.0),
        ("SOFT_STUDENT_IDLE_GAP", "Mahasiswa tidak mengalami jam kosong (gap) terlalu lama dalam satu hari", TipeAturan.SOFT, 20.0),
        ("SOFT_LECTURER_PREFERENCE", "Memenuhi preferensi hari dan jam mengajar dosen", TipeAturan.SOFT, 25.0),
        ("SOFT_MINIMIZE_ROOM_CHANGE", "Meminimalkan perpindahan ruangan untuk rombel yang sama pada hari yang sama", TipeAturan.SOFT, 10.0),
    ]
    for kode, nama, tipe, bobot in aturan_list:
        existing = db.query(AturanJadwal).filter(AturanJadwal.kode == kode).first()
        if not existing:
            db.add(AturanJadwal(
                kode=kode,
                nama=nama,
                tipe=tipe,
                bobot=bobot,
                aktif=True
            ))
    db.commit()

    # 5. Seed Fakultas (FST, FSEH, FAI)
    fakultas_data = [
        ("FST", "Fakultas Sains dan Teknologi"),
        ("FSEH", "Fakultas Sosial, Ekonomi, dan Humaniora"),
        ("FAI", "Fakultas Agama Islam"),
    ]
    fak_map = {}
    for f_kode, f_nama in fakultas_data:
        fak = db.query(Fakultas).filter(Fakultas.kode == f_kode).first()
        if not fak:
            fak = Fakultas(kode=f_kode, nama=f_nama, aktif=True)
            db.add(fak)
            db.flush()
        fak_map[f_kode] = fak
    db.commit()

    # 6. Seed Contoh Prodi
    prodi_data = [
        ("FST", "IF", "Informatika", "S1"),
        ("FST", "SI", "Sistem Informasi", "S1"),
        ("FSEH", "MAN", "Manajemen", "S1"),
        ("FSEH", "AKT", "Akuntansi", "S1"),
        ("FAI", "PAI", "Pendidikan Agama Islam", "S1"),
    ]
    prodi_map = {}
    for f_kode, p_kode, p_nama, jenjang in prodi_data:
        p = db.query(Prodi).filter(Prodi.kode == p_kode).first()
        if not p:
            p = Prodi(
                fakultas_id=fak_map[f_kode].id,
                kode=p_kode,
                nama=p_nama,
                jenjang=jenjang,
                aktif=True
            )
            db.add(p)
            db.flush()
        prodi_map[p_kode] = p
    db.commit()

    # 7. Seed Ruangan (Berdasarkan dokumen FST, FSEH, FAI)
    ruang_data = [
        ("R101", "Ruang 101", "Gedung A", 1, 45, JenisRuangan.KELAS),
        ("R102", "Ruang 102", "Gedung A", 1, 45, JenisRuangan.KELAS),
        ("R201", "Ruang 201", "Gedung A", 2, 40, JenisRuangan.KELAS),
        ("R202", "Ruang 202", "Gedung A", 2, 40, JenisRuangan.KELAS),
        ("LAB-KOM-1", "Laboratorium Komputer 1", "Gedung B", 1, 35, JenisRuangan.LABORATORIUM),
        ("LAB-KOM-2", "Laboratorium Komputer 2", "Gedung B", 1, 35, JenisRuangan.LABORATORIUM),
        ("GAZ-1", "Gazebo 1", "Area Terbuka", 1, 30, JenisRuangan.GAZEBO),
        ("GAZ-2", "Gazebo 2", "Area Terbuka", 1, 30, JenisRuangan.GAZEBO),
        ("AULA-UTAMA", "Aula Utama", "Gedung Rektorat", 3, 100, JenisRuangan.AULA),
    ]
    for r_kode, r_nama, gdg, lnt, kap, jns in ruang_data:
        r = db.query(Ruangan).filter(Ruangan.kode == r_kode).first()
        if not r:
            db.add(Ruangan(
                kode=r_kode,
                nama=r_nama,
                gedung=gdg,
                lantai=lnt,
                kapasitas=kap,
                jenis=jns,
                dapat_digunakan_bersama=True,
                aktif=True
            ))
    db.commit()

    # 8. Seed Periode Semester Aktif
    periode = db.query(SemesterPeriode).filter(SemesterPeriode.kode == "2026/2027-GASAL").first()
    if not periode:
        periode = SemesterPeriode(
            kode="2026/2027-GASAL",
            tahun_ajaran="2026/2027",
            semester=SemesterTipe.GASAL,
            tanggal_mulai=date(2026, 9, 1),
            tanggal_selesai=date(2027, 1, 31),
            status=StatusPeriode.ACTIVE
        )
        db.add(periode)
        db.commit()

    return {"status": "success", "message": "Master data and seeds successfully populated."}

def seed_demo_academic_data(db: Session):
    """Seed data akademik (Dosen, Mata Kuliah, Kelas rombel, Pengampu Tim-Teaching) untuk simulasi GA."""
    periode = db.query(SemesterPeriode).filter(SemesterPeriode.status == StatusPeriode.ACTIVE).first()
    if not periode:
        seed_master_data(db)
        periode = db.query(SemesterPeriode).filter(SemesterPeriode.status == StatusPeriode.ACTIVE).first()

    prodi_if = db.query(Prodi).filter(Prodi.kode == "IF").first()
    prodi_man = db.query(Prodi).filter(Prodi.kode == "MAN").first()

    # Dosen Demo
    dosen_raw = [
        ("Dr. Ahmad Fauzi", "M.Kom.", prodi_if.id),
        ("Siti Rahmawati", "M.Cs.", prodi_if.id),
        ("Budi Santoso", "M.T.", prodi_if.id),
        ("Nurul Hidayah", "M.Kom.", prodi_if.id),
        ("Dr. Hendra Wijaya", "M.M.", prodi_man.id),
        ("Dewi Lestari", "M.S.M.", prodi_man.id),
        ("Agus Pratama", "M.E.", prodi_man.id),
    ]
    dosen_map = {}
    for nama, gelar_blk, p_id in dosen_raw:
        d = db.query(Dosen).filter(Dosen.nama == nama).first()
        if not d:
            d = Dosen(nama=nama, gelar_belakang=gelar_blk, prodi_id=p_id, aktif=True)
            db.add(d)
            db.flush()
        dosen_map[nama] = d

    # Mata Kuliah Demo
    mk_raw = [
        ("IF101", "Algoritma & Pemrograman", 3, 2, 1, JenisMataKuliah.TEORI_PRAKTIK, prodi_if.id),
        ("IF102", "Basis Data", 3, 2, 1, JenisMataKuliah.TEORI_PRAKTIK, prodi_if.id),
        ("IF103", "Struktur Data", 3, 2, 1, JenisMataKuliah.TEORI, prodi_if.id),
        ("IF104", "Kecerdasan Buatan", 3, 3, 0, JenisMataKuliah.TEORI, prodi_if.id),
        ("MN101", "Pengantar Manajemen", 3, 3, 0, JenisMataKuliah.TEORI, prodi_man.id),
        ("MN102", "Akuntansi Manajemen", 3, 3, 0, JenisMataKuliah.TEORI, prodi_man.id),
        ("MN103", "Pemasaran Digital", 2, 2, 0, JenisMataKuliah.TEORI, prodi_man.id),
    ]
    mk_map = {}
    for kode, nama, sks, t_sks, p_sks, jns, p_id in mk_raw:
        mk = db.query(MataKuliah).filter(MataKuliah.kode == kode).first()
        if not mk:
            mk = MataKuliah(
                kode=kode, nama=nama, sks=sks, teori_sks=t_sks,
                praktik_sks=p_sks, jenis=jns, prodi_id=p_id, aktif=True
            )
            db.add(mk)
            db.flush()
        mk_map[kode] = mk

    # Kelas Rombel & Tim Pengampu
    kelas_raw = [
        # (kode_kelas, nama_kelas, mk_kode, jml_mhs, sks, jenis, [(dosen_nama, peran)])
        ("IF1A-ALGO", "Algoritma Pemrograman - Kelas 1A", "IF101", 32, 3, JenisMataKuliah.PRAKTIK, [("Dr. Ahmad Fauzi", PeranDosen.UTAMA), ("Siti Rahmawati", PeranDosen.ANGGOTA)]),
        ("IF1B-ALGO", "Algoritma Pemrograman - Kelas 1B", "IF101", 30, 3, JenisMataKuliah.PRAKTIK, [("Dr. Ahmad Fauzi", PeranDosen.UTAMA), ("Siti Rahmawati", PeranDosen.ANGGOTA)]),
        ("IF1A-BD", "Basis Data - Kelas 1A", "IF102", 34, 3, JenisMataKuliah.PRAKTIK, [("Budi Santoso", PeranDosen.UTAMA), ("Nurul Hidayah", PeranDosen.ANGGOTA)]),
        ("IF1B-BD", "Basis Data - Kelas 1B", "IF102", 32, 3, JenisMataKuliah.PRAKTIK, [("Budi Santoso", PeranDosen.UTAMA), ("Nurul Hidayah", PeranDosen.ANGGOTA)]),
        ("IF3A-AI", "Kecerdasan Buatan - Kelas 3A", "IF104", 38, 3, JenisMataKuliah.TEORI, [("Dr. Ahmad Fauzi", PeranDosen.UTAMA)]),
        ("MN1A-MGT", "Pengantar Manajemen - Kelas 1A", "MN101", 42, 3, JenisMataKuliah.TEORI, [("Dr. Hendra Wijaya", PeranDosen.UTAMA), ("Dewi Lestari", PeranDosen.ANGGOTA)]),
        ("MN1B-MGT", "Pengantar Manajemen - Kelas 1B", "MN101", 40, 3, JenisMataKuliah.TEORI, [("Dr. Hendra Wijaya", PeranDosen.UTAMA), ("Dewi Lestari", PeranDosen.ANGGOTA)]),
        ("MN1A-AKT", "Akuntansi Manajemen - Kelas 1A", "MN102", 38, 3, JenisMataKuliah.TEORI, [("Agus Pratama", PeranDosen.UTAMA)]),
        ("MN3A-MKT", "Pemasaran Digital - Kelas 3A", "MN103", 35, 2, JenisMataKuliah.TEORI, [("Dewi Lestari", PeranDosen.UTAMA)]),
    ]

    for k_kode, k_nama, mk_kode, jml_mhs, sks, jns, pengampus in kelas_raw:
        mk = mk_map[mk_kode]
        k = db.query(Kelas).filter(Kelas.kode_kelas == k_kode, Kelas.semester_periode_id == periode.id).first()
        if not k:
            k = Kelas(
                kode_kelas=k_kode,
                nama_kelas=k_nama,
                mata_kuliah_id=mk.id,
                prodi_id=mk.prodi_id,
                semester_periode_id=periode.id,
                semester_ke=1,
                jumlah_mahasiswa=jml_mhs,
                sks=sks,
                jenis=jns,
                status=StatusKelas.ACTIVE
            )
            db.add(k)
            db.flush()

            for idx, (d_nama, peran) in enumerate(pengampus):
                p_rel = PengampuKelas(
                    kelas_id=k.id,
                    dosen_id=dosen_map[d_nama].id,
                    peran=peran,
                    prioritas=idx + 1
                )
                db.add(p_rel)

    db.commit()
    return {"status": "success", "message": "Demo academic data populated."}

