# Backend API & Mesin Penjadwalan Algoritma Genetika (UNU)

Backend API berbasis **FastAPI (Python)** dan mesin optimasi **Algoritma Genetika (GA)** yang dibangun sesuai spesifikasi dokumen perencanaan dan skema ERD 20 tabel.

---

## 📁 Struktur Direktori Backend (`server/`)

```
server/
├── app/
│   ├── api/
│   │   ├── deps.py                     # Dependensi Session DB
│   │   └── v1/
│   │       ├── api_router.py           # Agregator rute API v1
│   │       └── endpoints/
│   │           ├── master.py           # Fakultas, Prodi, Ruang, Shift, Hari, Slot 50m
│   │           ├── academic.py         # Dosen, Matkul, Rombel Kelas, Pengampu
│   │           ├── constraints.py      # Ketersediaan Dosen, Preferensi, Bobot Aturan
│   │           ├── ga.py               # Runner GA, Polling Status, Jadwal Matrix, Adjust, Export
│   │           ├── excel_io.py         # Unduh Template Excel & Upload Impor Data
│   │           └── seed.py             # Endpoint Seeder Data Awal
│   ├── core/
│   │   ├── config.py                   # Pydantic Settings & CORS
│   │   └── database.py                 # SQLAlchemy Engine & Session
│   ├── engine_ga/                      # CORE MESIN ALGORITMA GENETIKA
│   │   ├── chromosome.py               # Representasi Gen, Kromosom, Pelanggaran
│   │   ├── context.py                  # Cache memori cepat untuk data akademik & aturan
│   │   ├── fitness.py                  # Evaluator Hard Constraints & Soft Constraints
│   │   ├── operators.py                # Tournament Selection, Crossover, Mutasi, Local Repair
│   │   └── solver.py                   # Loop GA, Elitisme, Callback Progress, Multi-Kandidat
│   ├── models/                         # 20 TABEL SKEMA ERD
│   │   ├── enums.py                    # Enum tipe data (Ruang, Matkul, Status, Severity)
│   │   ├── schedule_master.py          # semester_periode, ruangan, shift, hari, slot_waktu
│   │   ├── academic.py                 # fakultas, prodi, dosen, mata_kuliah, kurikulum, kelas, pengampu_kelas
│   │   ├── constraints.py              # ketersediaan_dosen, preferensi_dosen, aturan_jadwal
│   │   ├── ga_schedule.py              # job_ga, versi_jadwal, jadwal, pelanggaran_jadwal
│   │   └── audit.py                    # audit_log
│   └── services/
│       ├── excel_service.py            # Generator Template, Parser Impor, dan Ekspor Excel Multi-Sheet
│       └── seeder.py                   # Seed master awal (FST, FSEH, Hari, Shift, Slot, Ruang, Demo)
├── main.py                             # Entrypoint FastAPI & Lifespan DB
├── requirements.txt                    # Dependensi Python
└── test_direct.py                      # Skrip verifikasi & pengujian otomatis
```

---

## 🚀 Cara Menjalankan Backend

### 1. Masuk ke environment virtual
```powershell
.\server\venv\Scripts\Activate.ps1
```

### 2. Jalankan Server FastAPI
```powershell
python -m uvicorn server.main:app --reload --port 8000
```
Server akan berjalan di `http://127.0.0.1:8000`.
- **Dokumentasi Swagger UI**: `http://127.0.0.1:8000/docs`
- **Dokumentasi ReDoc**: `http://127.0.0.1:8000/redoc`
- **File Skema OpenAPI JSON**: `server/docs/openapi.json` (dapat langsung diimpor ke Postman atau Insomnia)

> **Fitur Swagger UI yang Tersedia**:
> - Panduan arsitektur sistem & aturan penalti Algoritma Genetika di header dokumentasi.
> - Pengelompokan rapi dalam 6 kategori tag (Master, Akademik, Constraints, GA, Excel, Seeding).
> - Fitur pencarian filter endpoint aktif.
> - Tombol `Try it out` langsung aktif untuk menguji setiap endpoint.
> - Respon visual skema input Pydantic dan kode HTTP status (200, 400, 404, 409).

---

## 🧬 Fitur Mesin Algoritma Genetika
- **Struktur Gen**: `(kelas_id, ruangan_id, hari_id, slot_mulai_id, durasi_slot)`.
- **Hard Constraints**:
  - `HARD_NO_LECTURER_CLASH`: Dosen tidak mengajar bentrok di waktu yang sama (termasuk tim teaching N:M).
  - `HARD_NO_ROOM_CLASH`: Ruangan tidak dipakai ganda di slot yang sama.
  - `HARD_NO_CLASS_CLASH`: Rombel mahasiswa tidak tabrakan jadwal.
  - `HARD_ROOM_CAPACITY`: Kapasitas ruangan mencukupi jumlah mahasiswa rombel.
  - `HARD_LAB_REQUIREMENT`: Kelas praktikum wajib dialokasikan di laboratorium komputer / lab terkait.
  - `HARD_LECTURER_AVAILABILITY`: Menghormati waktu ketersediaan dosen.
- **Soft Constraints**:
  - `SOFT_DAY_SPREAD`: Sebaran hari merata (Senin s/d Sabtu).
  - `SOFT_LECTURER_GAP`: Istirahat dan beban mengajar dosen.
  - `SOFT_STUDENT_IDLE_GAP`: Mengurangi jam kosong panjang mahasiswa.
  - `SOFT_LECTURER_PREFERENCE`: Preferensi jam/hari dosen.
  - `SOFT_MINIMIZE_ROOM_CHANGE`: Meminimalkan perpindahan gedung/ruang bagi mahasiswa.
- **Hybrid Local Repair**: Heuristik pencarian lokal untuk merelokasi gen bentrok secara cerdas sehingga konvergensi lebih cepat.
- **Multi-Kandidat**: Menghasilkan 3 alternatif jadwal terbaik beserta skor fitness dan rincian pelanggarannya.
- **Drag-and-Drop Adjustment**: Admin dapat menggeser posisi jadwal manual dengan *live conflict detection*.

---

## 📊 Endpoint Impor Template & Matriks Jadwal

| Method | Endpoint | Fungsi |
| :--- | :--- | :--- |
| `GET` | `/api/v1/excel/template` | **Unduh Template Excel** (.xlsx) 5-sheet terstandarisasi untuk persiapan impor. |
| `POST` | `/api/v1/excel/upload` | **Upload & Impor Excel** (otomatis validasi, sanitasi, dan simpan ke DB). |
| `GET` | `/api/v1/ga/versions/{id}/export-excel` | **Unduh Jadwal Kuliah** hasil GA ke format Excel multi-sheet. |
| `GET` | `/api/v1/ga/versions/{id}/matrix` | **Matriks Jadwal untuk Frontend** (mendukung `view_by=room`, `lecturer`, `class`). |


