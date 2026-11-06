# Sistem Informasi Penjadwalan Kuliah Berbasis Algoritma Genetika (UNU)

Frontend modern berbasis **Next.js (React 19) + TypeScript + Tailwind CSS** yang dirancang untuk otomasi penyusunan jadwal perkuliahan bebas bentrok (*conflict-free*), visualisasi matriks, portal publik berbasis Barcode/QR tanpa login, cetak stiker pintu ruangan, dan persetujuan permohonan ganti jadwal terpusat.

---

## 📁 Struktur Halaman Frontend (`app/src/app`)

```
src/
├── app/
│   ├── layout.tsx                     # Layout global, proteksi route, & badge status semester
│   ├── page.tsx                       # Redirect & Dashboard ringkasan akademik
│   ├── login/page.tsx                 # Autentikasi Admin/Petugas BAAK (JWT Bearer Token)
│   │
│   ├── master/page.tsx                # Master Data (Periode Semester, Prodi, Ruang, Dosen, MK, Kelas)
│   ├── master/stiker-ruang/page.tsx   # Generator & Cetak Lembar Stiker QR Pintu Ruangan (A4)
│   ├── import/page.tsx                # Unduh Template Excel 5-Sheet & Unggah Data Perkuliahan
│   ├── rules/page.tsx                 # Pengaturan Bobot Penalti Hard & Soft Constraints
│   ├── generator/page.tsx             # Ruang Kendali GA (Slider Parameter, Progress Live, Evaluasi Fitness)
│   ├── matrix/page.tsx                # Matriks Grid Jadwal 2D (View: Ruang, Dosen, Kelas & Geser Manual)
│   ├── request-jadwal/page.tsx        # Inbox Approval BAAK (Persetujuan Permohonan Ganti Jadwal Dosen)
│   │
│   └── jadwal/                        # PORTAL PUBLIK (Bebas Akses / Zero-Login)
│       ├── page.tsx                   # Pencarian & Direktori Jadwal Dosen, Ruangan, dan Kelas
│       ├── dosen/[id]/page.tsx        # Jadwal Dosen + Fitur Ajukan Ganti Jadwal (Verifikasi NIDN)
│       ├── ruangan/[id]/page.tsx      # Jadwal Pintu Ruangan (Target Pindaian QR Pintu)
│       └── kelas/[id]/page.tsx        # Jadwal Kuliah Per Rombongan Belajar (Rombel)
│
├── components/
│   └── Navbar.tsx                     # Header navigasi dinamis (Status Semester Aktif & Role Admin)
└── lib/
    ├── api.ts                         # Klien API typed terhubung ke FastAPI Backend (/api/v1)
    ├── auth.ts                        # Manajemen sesi JWT Admin (localStorage & cookies)
    └── types.ts                       # Definisi TypeScript seluruh entitas & payload
```

---

## 🔄 Alur Kerja Lengkap Penggunaan Aplikasi (Workflow SOP)

Diagram alur operasional dari awal semester hingga operasional harian:

```
[TAHAP 1: PERSIAPAN]
 ├── 1. Admin Login (/login)
 ├── 2. Buka Periode Semester Baru di Master Data (/master)
 └── 3. Unggah Rombel Kelas & Pengampu via Excel (/import)
        ↓
[TAHAP 2: OPTIMASI PENJADWALAN]
 ├── 4. Cek Aturan & Bobot Penalti (/rules)
 └── 5. Jalankan Algoritma Genetika di Mesin GA (/generator)
        ↓
[TAHAP 3: REVIEW & PUBLIKASI]
 ├── 6. Tinjau Matriks & Validasi Bentrok (/matrix)
 ├── 7. Klik "Publikasikan Jadwal" (Status: PUBLISHED)
 └── 8. Cetak Stiker QR Pintu Ruangan (/master/stiker-ruang)
        ↓
[TAHAP 4: OPERASIONAL HARIAN]
 ├── 9. Dosen/Mhs Scan Barcode QR (Tanpa Login) (/jadwal/...)
 ├── 10. Dosen Ajukan Ganti Jadwal (Validasi NIDN + Slot Bebas Bentrok)
 └── 11. BAAK Menyetujui/Menolak di Inbox Permohonan (/request-jadwal)
```

---

### Tahap 1: Persiapan Data Awal Semester (Admin)

1. **Login Administrator**:
   * Buka browser ke `http://localhost:3000/login`.
   * Masukkan username: `admin` dan password: `admin123`.
   * Setelah login, menu admin (*Master Data*, *Mesin GA*, *Impor Data*, *Aturan & Bobot*, *Permohonan Ganti*) akan muncul di Navbar.

2. **Pengaturan Periode Semester**:
   * Buka menu **Master Data** $\rightarrow$ tab **Periode Semester**.
   * Jika memasuki semester baru (misal: *Genap 2026/2027*), klik tombol **"Tambah Periode Semester"**.
   * Di tabel semester, klik tombol hijau **`⭐ Aktifkan`**.
   * *Sistem secara otomatis mengarsipkan semester lama dan memperbarui status aktif di seluruh sistem.*

3. **Input Data Perkuliahan**:
   * Buka menu **Impor Data** (`/import`).
   * Unduh file `Template_Data_Penjadwalan_Kuliah_UNU.xlsx`.
   * Isi sheet Rombel Kelas, Dosen Pengampu, dan Mata Kuliah untuk semester berjalan.
   * Unggah kembali file Excel $\rightarrow$ data otomatis tersimpan di database.

4. **Atur Ketersediaan Waktu / Jam Sibuk Dosen (Opsional - Pre-Schedule Constraint)**:
   * Buka menu **Master Data** $\rightarrow$ tab **Dosen**.
   * Pada baris dosen yang memiliki request jam khusus (misal tidak bisa mengajar hari Jumat atau jam tertentu), klik tombol kuning **`🕒 Jam Sibuk`**.
   * Pada matriks mingguan (Hari x Slot Jam), klik slot jam untuk mengubahnya menjadi merah **`⛔ Sibuk (Tidak Bersedia)`**.
   * Klik **"Simpan Ketersediaan"**.
   * *Mesin GA secara mutlak akan dilarang menaruh kuliah dosen tersebut di jam sibuk yang ditandai.*

---

### Tahap 2: Optimasi Penjadwalan Otomatis (Mesin GA)

5. **Tinjau Aturan & Bobot (`/rules`)**:
   * Pastikan Hard Constraints aktif (bentrok ruang, bentrok dosen, bentrok rombel, lab praktikum, ketersediaan dosen).
   * Sesuaikan bobot penalti Soft Constraints (preferensi hari dosen, jeda waktu mahasiswa) jika diperlukan.

6. **Jalankan Algoritma Genetika (`/generator`)**:
   * Tentukan parameter GA:
     * **Ukuran Populasi**: 100
     * **Generasi**: 200
     * **Crossover Rate**: 0.85
     * **Mutation Rate**: 0.05
   * Klik tombol **"Jalankan Komputasi GA"**.
   * Amati kurva evolusi hingga skor fitness mendekati 1.0 (0 bentrok hard constraint).
   * GA akan menghasilkan kandidat jadwal optimal.

---

### Tahap 3: Review, Publikasi, & Cetak QR Ruangan

6. **Review Matriks Jadwal (`/matrix`)**:
   * Tinjau jadwal melalui 3 sudut pandang: **Per Ruangan**, **Per Dosen**, atau **Per Rombel Kelas**.
   * Lakukan penyesuaian manual jika diperlukan menggunakan fitur *Pindah Posisi Jadwal* (sistem tetap melakukan *live conflict check*).
   * Klik tombol **"Publikasikan Jadwal"**. Jadwal resmi tersimpan dengan status `PUBLISHED`.

7. **Cetak Stiker QR Pintu Ruangan (`/master/stiker-ruang`)**:
   * Buka menu Master Data $\rightarrow$ klik **"🖨️ Cetak Stiker QR Pintu Ruangan"**.
   * Pilih ruangan yang diinginkan.
   * Cetak lembar A4 ber-KOP resmi universitas dan tempelkan di depan pintu ruangan masing-masing.
   * *Stiker ini bersifat permanen karena selalu mengarah ke jadwal semester aktif.*

---

### Tahap 4: Operasional Harian & Permohonan Ganti Jadwal

8. **Akses Publik (Dosen & Mahasiswa - Tanpa Login)**:
   * Mahasiswa/dosen cukup memindai QR Code di pintu atau membuka portal publik di `http://localhost:3000/jadwal`.
   * Dapat melihat agenda kuliah harian/mingguan secara transparan dan realtime.

9. **Pengajuan Ganti Jadwal Mandiri oleh Dosen**:
   * Dosen membuka halaman jadwal pribadinya di `/jadwal/dosen/[id]`.
   * Pada sesi kuliah yang ingin diganti, klik tombol **"Ajukan Ganti Jadwal"**.
   * Dosen memasukkan nomor **NIDN** untuk verifikasi identitas kilat tanpa password.
   * Sistem secara otomatis menghitung dan hanya menyajikan **slot hari & ruang yang 100% kosong dan bebas bentrok** (dosen, rombel, ruang, dan jenis lab).
   * Dosen memasukkan alasan permohonan lalu klik **"Kirim Permohonan"**.

10. **Persetujuan oleh BAAK (`/request-jadwal`)**:
    * Admin BAAK membuka menu **Permohonan Ganti**.
    * Melihat kartu komparasi *Jadwal Asal* vs *Jadwal Usulan Baru* beserta alasan dosen.
    * Klik **"Setujui (Approve)"**:
      - Jadwal di database SQLite langsung dipindahkan seketika.
      - Matriks dan jadwal di barcode QR ruangan langsung terupdate otomatis.
    * Atau klik **"Tolak (Reject)"** dengan menyertakan catatan penjelasan bagi dosen.

---

## 👥 Matriks Hak Akses (Role Permissions)

| Fitur / Halaman | Pengunjung / Mahasiswa | Dosen | Petugas BAAK / Admin |
| :--- | :---: | :---: | :---: |
| **Portal Publik Jadwal (`/jadwal`)** | ✅ Akses Penuh | ✅ Akses Penuh | ✅ Akses Penuh |
| **Scan QR Pintu Ruangan (`/jadwal/ruangan/[id]`)** | ✅ Akses Penuh | ✅ Akses Penuh | ✅ Akses Penuh |
| **Ajukan Ganti Jadwal** | ❌ | ✅ Verifikasi NIDN | ✅ Akses Penuh |
| **Matriks Jadwal (`/matrix`)** | ✅ View Only | ✅ View Only | ✅ Edit & Publikasi |
| **Approval Ganti Jadwal (`/request-jadwal`)** | ❌ | ❌ | ✅ Wajib Login |
| **Master Data & Periode (`/master`)** | ❌ | ❌ | ✅ Wajib Login |
| **Cetak Stiker Pintu (`/master/stiker-ruang`)** | ❌ | ❌ | ✅ Wajib Login |
| **Mesin Algoritma Genetika (`/generator`)** | ❌ | ❌ | ✅ Wajib Login |
| **Impor Data Excel (`/import`)** | ❌ | ❌ | ✅ Wajib Login |
| **Aturan & Bobot Penalti (`/rules`)** | ❌ | ❌ | ✅ Wajib Login |

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Jalankan Backend (FastAPI)
```powershell
cd server
venv\Scripts\activate
python -m uvicorn server.app.main:app --reload --port 8000
```
Swagger API Docs aktif di `http://127.0.0.1:8000/docs`.

### 2. Jalankan Frontend (Next.js)
```powershell
cd app
pnpm dev
```
Aplikasi web aktif di `http://localhost:3000`.
