"""
Skrip Migrasi Data dari SQLite ke PostgreSQL
Cara Penggunaan:
1. Buat database kosong di PostgreSQL (misal via pgAdmin: "penjadwalan_ga")
2. Pastikan DATABASE_URL di server/.env sudah diubah ke PostgreSQL:
   DATABASE_URL="postgresql://postgres:password_kamu@localhost:5432/penjadwalan_ga"
3. Jalankan skrip ini:
   python server/migrate_sqlite_to_postgres.py
"""

import sys
import os
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import sessionmaker

# Tambahkan path root agar modul server terbaca
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from server.app.core.config import settings
from server.app.core.database import Base
# Import all models so metadata knows them
import server.app.models

SQLITE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "penjadwalan_ga.db")).replace("\\", "/")
SQLITE_URL = f"sqlite:///{SQLITE_PATH}"

def migrate():
    print("=" * 60)
    print("MIGRASI DATA: SQLite -> PostgreSQL")
    print("=" * 60)

    target_url = settings.DATABASE_URL
    if not target_url.startswith("postgresql"):
        print("\n[PERINGATAN]")
        print("DATABASE_URL di file server/.env saat ini masih:", target_url)
        print("Ubah terlebih dahulu DATABASE_URL di server/.env menjadi format PostgreSQL:")
        print('Contoh: DATABASE_URL="postgresql://postgres:password123@localhost:5432/penjadwalan_ga"')
        return

    if target_url.startswith("postgresql://"):
        target_url = target_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    print(f"1. Membaca sumber SQLite: {SQLITE_URL}")
    sqlite_engine = create_engine(SQLITE_URL)

    print(f"2. Menghubungkan ke PostgreSQL: {target_url}")
    try:
        pg_engine = create_engine(target_url)
        with pg_engine.connect() as conn:
            print("   -> Koneksi ke PostgreSQL BERHASIL!")
    except Exception as e:
        print("   -> GAGAL terhubung ke PostgreSQL:")
        print(f"      {e}")
        print("\nPastikan:")
        print("1. Service PostgreSQL sudah berjalan (Port 5432).")
        print("2. Database sudah dibuat di pgAdmin.")
        print("3. Username & password di server/.env sudah benar.")
        return

    print("3. Membuat skema seluruh tabel di PostgreSQL...")
    Base.metadata.create_all(bind=pg_engine)
    print("   -> Seluruh tabel berhasil dibuat di PostgreSQL.")

    print("4. Menyalin data tabel per tabel...")
    
    # Urutan tabel terstruktur untuk mematuhi Foreign Keys
    tables_order = [
        "fakultas",
        "prodi",
        "ruangan",
        "semester_periode",
        "shift",
        "hari",
        "slot_waktu",
        "dosen",
        "mata_kuliah",
        "kurikulum_mata_kuliah",
        "kelas",
        "pengampu_kelas",
        "aturan_jadwal",
        "ketersediaan_dosen",
        "preferensi_dosen",
        "job_ga",
        "versi_jadwal",
        "jadwal",
        "pelanggaran_jadwal",
        "permohonan_ganti_jadwal",
        "users",
        "audit_logs"
    ]

    sqlite_meta = MetaData()
    sqlite_meta.reflect(bind=sqlite_engine)

    pg_meta = MetaData()
    pg_meta.reflect(bind=pg_engine)

    print("4. Membersihkan data lama di PostgreSQL jika ada...")
    with pg_engine.begin() as pg_conn:
        for table_name in reversed(tables_order):
            if table_name in pg_meta.tables:
                try:
                    pg_conn.execute(text(f'TRUNCATE TABLE "{table_name}" CASCADE;'))
                except Exception:
                    pass

    print("5. Menyalin data dari SQLite ke PostgreSQL...")
    total_records = 0
    with pg_engine.begin() as pg_conn:
        for table_name in tables_order:
            if table_name not in sqlite_meta.tables:
                continue
            
            src_table = sqlite_meta.tables[table_name]
            dst_table = pg_meta.tables.get(table_name)
            if dst_table is None:
                continue

            # Ambil data dari SQLite
            with sqlite_engine.connect() as sq_conn:
                rows = sq_conn.execute(src_table.select()).mappings().all()

            if not rows:
                print(f"   - {table_name:25}: 0 baris")
                continue

            # Masukkan data ke PostgreSQL
            pg_conn.execute(dst_table.insert(), [dict(r) for r in rows])
            print(f"   - {table_name:25}: {len(rows)} baris disalin")
            total_records += len(rows)

    print("\n" + "=" * 60)
    print(f"MIGRASI SELESAI DENGAN SUKSES! Total {total_records} data tersalin.")
    print("Sekarang aplikasi sudah terhubung penuh ke PostgreSQL.")
    print("Anda bisa melihat seluruh tabelnya langsung di pgAdmin!")
    print("=" * 60)

if __name__ == "__main__":
    migrate()

