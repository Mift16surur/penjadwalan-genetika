import sys
import os

# Pastikan direktori root proyek dan direktori server ada di sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.abspath(os.path.join(_current_dir, ".."))
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from server.app.core.config import settings
from server.app.core.database import Base, engine, SessionLocal
from server.app.api.v1.api_router import api_router
from server.app.services.seeder import seed_master_data
from server.app.models import Hari

API_DESCRIPTION = """
## 🎓 Sistem Penjadwalan Kuliah Otomatis Berbasis Algoritma Genetika
**Universitas Nahdlatul Ulama (UNU)**

Sistem ini dirancang untuk memecahkan permasalahan penjadwalan perkuliahan (*University Timetabling Problem*) yang kompleks di lingkungan multi-fakultas (FST, FSEH, FAI), multi-dosen (tim-teaching ~92%), dan multi-shift (pagi & malam).

---

### 🧬 Fitur Utama Mesin Algoritma Genetika (GA):
1. **Representasi Gen Diskrit**: Setiap sesi kuliah dialokasikan pada pasangan `(ruangan, hari, slot_mulai, durasi)`.
2. **Evaluasi Hard Constraints (Wajib Nol Pelanggaran)**:
   - Tidak ada bentrok Dosen mengajar ganda (termasuk tim pengampu N:M).
   - Tidak ada bentrok Ruangan dipakai ganda.
   - Tidak ada bentrok Rombel Mahasiswa pada waktu yang sama.
   - Kapasitas ruangan mencukupi jumlah mahasiswa rombel.
   - Mata kuliah praktikum wajib di Laboratorium Komputer/Lab terkait.
   - Menghormati batas waktu shift dan waktu ketersediaan dosen.
3. **Evaluasi Soft Constraints (Optimasi Kualitas)**:
   - Sebaran hari merata (Senin s/d Sabtu).
   - Beban dan jeda mengajar dosen.
   - Mengurangi jeda kosong panjang (*idle gap*) antar sesi bagi mahasiswa.
   - Pemenuhan preferensi hari/jam mengajar dosen.
   - Minimalisasi perpindahan gedung/ruangan bagi mahasiswa.
4. **Hybrid Local Search**: Heuristik perbaikan lokal untuk mereparasi bentrok minor secara otomatis.
5. **Multi-Kandidat**: Menghasilkan alternatif jadwal terbaik dengan skor fitness transparan.

---

### 📊 Alur Operasional Sistem:
1. **Download Template Excel**: Ambil template melalui `/api/v1/excel/template`.
2. **Impor / Isi Data**: Unggah data melalui `/api/v1/excel/upload` atau gunakan endpoint Master/Akademik.
3. **Atur Bobot Aturan**: Sesuaikan bobot penalti di `/api/v1/constraints/rules`.
4. **Jalankan Solver GA**: Trigger background job melalui `/api/v1/ga/jobs`.
5. **Review Matriks & Revisi Manual**: Pantau progress di `/api/v1/ga/jobs/{id}`, lihat matriks `/api/v1/ga/versions/{id}/matrix`, dan lakukan penyesuaian di `/api/v1/ga/items/{id}/adjust`.
6. **Ekspor & Publikasi**: Unduh jadwal Excel di `/api/v1/ga/versions/{id}/export-excel` dan publish jadwal.
"""

OPENAPI_TAGS = [
    {
        "name": "Import & Export Excel",
        "description": "Unduh format template Excel resmi, unggah/impor data akademik, serta ekspor hasil jadwal perkuliahan ke format .xlsx multi-sheet."
    },
    {
        "name": "Algoritma Genetika",
        "description": "Eksekusi background job optimasi GA, pemantauan progress real-time, perbandingan kandidat versi, matriks visualisasi grid, dan penyesuaian manual (drag-and-drop) dengan deteksi bentrok seketika."
    },
    {
        "name": "Akademik & Kelas",
        "description": "Manajemen data Dosen, Mata Kuliah (Teori/Praktik), Kelas Rombel, dan Tim Pengampu (Banyak-ke-Banyak / Team Teaching)."
    },
    {
        "name": "Constraints & Aturan",
        "description": "Konfigurasi ketersediaan waktu dosen (hard constraint), preferensi dosen (soft constraint), serta penyesuaian bobot penalti aturan jadwal."
    },
    {
        "name": "Master Data",
        "description": "Manajemen data master: Fakultas, Program Studi, Ruangan (Kelas/Lab/Gazebo/Aula), Shift (Pagi/Malam), Hari (Senin-Sabtu), dan Slot Waktu 50 menit."
    },
    {
        "name": "Seeding Data",
        "description": "Utilitas untuk populate data awal (Master & Demo Akademik) untuk keperluan simulasi dan pengujian sistem."
    }
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Pastikan tabel ada jika bukan testing
    if not os.environ.get("TESTING"):
        try:
            Base.metadata.create_all(bind=engine)
            
            # Auto-seed master data jika database baru
            db = SessionLocal()
            try:
                if not db.query(Hari).first():
                    print("[INFO] Database kosong, menjalankan seed master awal...")
                    seed_master_data(db)
                    print("[INFO] Seed master awal selesai.")
            finally:
                db.close()
        except Exception as err:
            print(f"[WARN] Inisialisasi database database saat startup dilewati: {err}")
    
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description=API_DESCRIPTION,
    openapi_tags=OPENAPI_TAGS,
    docs_url="/docs",
    redoc_url="/redoc",
    swagger_ui_parameters={
        "defaultModelsExpandDepth": -1, # Sembunyikan skema mentah di bagian bawah agar Swagger bersih
        "docExpansion": "list",         # Buka tag sebagai list ringkas
        "filter": True,                 # Kotak pencarian endpoint aktif
        "tryItOutEnabled": True         # Tombol Try It Out langsung aktif
    },
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Info"])
def root():
    """Informasi dasar status API dan tautan cepat ke dokumentasi Swagger."""
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "swagger_docs": "/docs",
        "redoc_docs": "/redoc",
        "api_v1_prefix": settings.API_V1_STR
    }

@app.get("/health", tags=["Info"])
def healthcheck():
    """Pemeriksaan status kesehatan server (healthcheck probe)."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True)
