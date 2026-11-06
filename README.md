# Sistem Penjadwalan Kuliah Otomatis Berbasis Algoritma Genetika
### Universitas Nahdlatul Ulama (UNU)

Sistem komputasi penjadwalan perkuliahan otomatis (*University Timetabling System*) dengan arsitektur terpisah antara **Backend & Mesin Algoritma Genetika (Python / FastAPI)** dan **Frontend Web (Next.js / React / TypeScript / Tailwind CSS)**.

---

## 🏗️ Arsitektur Proyek

```
algoritmaGenetik/
├── app/                        # FRONTEND (Next.js 16 + React 19 + Tailwind CSS)
│   ├── src/app/
│   │   ├── matrix/page.tsx     # Matriks Grid Jadwal 2D (Ruang, Dosen, Kelas) + Geser Manual
│   │   ├── generator/page.tsx  # Kontrol Mesin GA (Progress bar real-time & Parameter)
│   │   ├── import/page.tsx     # Unduh Template Excel Resmi 5-Sheet & Upload Data
│   │   ├── master/page.tsx     # Master Ruangan, Dosen, Matkul, Rombel
│   │   └── rules/page.tsx      # Konfigurasi Bobot Penalti Aturan
│   ├── src/lib/api.ts          # Client API typed terhubung ke FastAPI
│   └── next.config.ts          # Auto proxy rewrites /api/* -> Backend :8000
│
├── server/                     # BACKEND & MESIN GA (FastAPI + SQLAlchemy + NumPy)
│   ├── app/
│   │   ├── api/v1/             # 29 Endpoint REST API & Swagger UI (/docs)
│   │   ├── engine_ga/          # Core GA (Kromosom, Fitness Evaluator, Hybrid Local Search)
│   │   ├── models/             # 20 Tabel ERD Skema Relasional Akademik
│   │   └── services/           # Excel Template Generator, Importer, Exporter, Seeder
│   └── main.py                 # FastAPI Application Server
```

---

## ⚡ Cara Menjalankan Sistem

### 1. Jalankan Backend (Terminal 1)
```powershell
# Masuk ke direktori server
cd d:\algoritmaGenetik\server

# Jalankan server FastAPI
.\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```
- **Backend API**: `http://127.0.0.1:8000`
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

### 2. Jalankan Frontend (Terminal 2)
```powershell
# Masuk ke direktori app
cd d:\algoritmaGenetik\app

# Jalankan server Next.js
pnpm dev
```
- **Frontend Web**: `http://localhost:3000`

---

## 🌟 Fitur Utama
1. **Pola Jadwal Kampus UNU**:
   - Mendukung slot waktu diskrit 50 menit, shift pagi (mulai 07.30) dan malam.
   - Mendukung perkuliahan **Tim Teaching (2 dosen per kelas)** secara *many-to-many* (~92% temuan di FSEH).
   - Pengalokasian otomatis kelas praktikum ke laboratorium komputer dan teori ke ruang kelas reguler.
2. **Mesin Optimasi GA Canggih**:
   - Evaluasi Hard Constraints (0 bentrok dosen, ruang, rombel, kapasitas, lab, shift boundary).
   - Evaluasi Soft Constraints (sebaran hari merata, jeda mengajar dosen, pengurangan jam kosong mahasiswa).
   - *Hybrid Local Search Repair*: Mempercepat eliminasi bentrok minor secara cerdas.
3. **Format Excel Resmi**:
   - Tersedia tombol satu klik untuk **Unduh Template Excel** (.xlsx) 5-sheet untuk pengisian data akademik.
   - Unggah & impor otomatis dengan sanitasi data.
   - Ekspor jadwal final ke format Excel multi-sheet siap edar.
4. **Matriks Visualisasi & Revisi Manual**:
   - Tampilan matriks interaktif menurut Ruangan, Dosen, atau Rombel Kelas.
   - Pindahkan jadwal secara *drag-and-drop / modal* dengan deteksi bentrok seketika.

