export interface UserAdmin {
  id: string;
  username: string;
  nama_lengkap: string;
  email?: string;
  role: string;
  aktif: boolean;
  created_at: string;
}

export interface SemesterPeriode {
  id: string;
  kode: string;
  tahun_ajaran: string;
  semester: "GASAL" | "GENAP";
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  created_at?: string;
}

export interface Fakultas {
  id: string;
  kode: string;
  nama: string;
  aktif?: boolean;
}

export interface Prodi {
  id: string;
  kode: string;
  nama: string;
  jenjang: string;
  fakultas_id?: string;
  fakultas?: Fakultas;
  aktif?: boolean;
}

export interface Ruangan {
  id: string;
  kode: string;
  nama: string;
  gedung?: string;
  lantai: number;
  kapasitas: number;
  jenis: "KELAS" | "LABORATORIUM" | "GAZEBO" | "AULA" | "LAINNYA";
  aktif?: boolean;
}

export interface Dosen {
  id: string;
  nidn?: string;
  nip?: string;
  nama: string;
  gelar_depan?: string;
  gelar_belakang?: string;
  nama_lengkap: string;
  email?: string;
  prodi_id?: string;
  aktif?: boolean;
}

export interface MataKuliah {
  id: string;
  kode: string;
  nama: string;
  sks: number;
  teori_sks?: number;
  praktik_sks?: number;
  jenis: "TEORI" | "PRAKTIK" | "TEORI_PRAKTIK";
  prodi_id?: string;
  aktif?: boolean;
}

export interface Kelas {
  id: string;
  kode_kelas: string;
  nama_kelas: string;
  mata_kuliah_id: string;
  prodi_id: string;
  semester_periode_id: string;
  semester_ke: number;
  jumlah_mahasiswa: number;
  sks: number;
  jenis: string;
  status?: "DRAFT" | "ACTIVE" | "CANCELLED";
  pengampu_list?: Array<{
    dosen?: Dosen;
    peran: string;
  }>;
}

export interface AturanJadwal {
  id: string;
  kode: string;
  nama: string;
  tipe: "HARD" | "SOFT";
  bobot: number;
  aktif: boolean;
}

export interface JobGA {
  id: string;
  semester_periode_id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  populasi: number;
  generasi: number;
  mutation_rate: number;
  crossover_rate: number;
  fitness_terbaik?: number;
  progress: number;
  started_at?: string;
  finished_at?: string;
}

export interface VersiJadwal {
  id: string;
  nomor_versi: number;
  nama: string;
  fitness_score: number;
  jumlah_pelanggaran: number;
  status: "DRAFT" | "GENERATED" | "REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";
  created_at: string;
}

export interface JadwalMatrixCell {
  jadwal_id: string;
  kelas_id: string;
  kode_kelas: string;
  nama_kelas: string;
  sks: number;
  dosen: string;
  ruangan_id: string;
  nama_ruang: string;
  hari_id: number;
  hari_nama: string;
  slot_mulai_nomor: number;
  durasi_slot: number;
  manual_edit: boolean;
  is_start: boolean;
}

export interface ScheduleMatrixResponse {
  version_id: string;
  version_name: string;
  fitness_score: number;
  total_violations: number;
  view_by: "room" | "lecturer" | "class";
  columns: Array<{
    id: string;
    kode: string;
    nama: string;
    kapasitas?: number;
    jenis?: string;
    sks?: number;
  }>;
  days: Array<{
    id: number;
    kode: string;
    nama: string;
  }>;
  time_slots: Array<{
    id: string;
    nomor: number;
    jam_mulai: string;
    jam_selesai: string;
    shift: string;
  }>;
  cells: Record<string, JadwalMatrixCell>;
}


export interface AvailableSlotItem {
  hari_id: number;
  hari_nama: string;
  slot_id: string;
  slot_nomor: number;
  jam_mulai: string;
  jam_selesai: string;
  ruangan_id: string;
  ruangan_kode: string;
  ruangan_nama: string;
  ruangan_gedung?: string;
  kapasitas: number;
  jenis: string;
}

export interface PermohonanGantiJadwal {
  id: string;
  jadwal_id: string;
  dosen_id: string;
  dosen_nama: string;
  dosen_nidn?: string;
  mata_kuliah_nama: string;
  mata_kuliah_kode: string;
  kelas_nama: string;
  kelas_kode: string;
  sks: number;
  
  hari_asal: string;
  jam_asal: string;
  ruangan_asal: string;
  
  hari_tujuan_id: number;
  hari_tujuan: string;
  slot_tujuan_id: string;
  jam_tujuan: string;
  ruangan_tujuan_id: string;
  ruangan_tujuan: string;
  ruangan_tujuan_gedung?: string;
  
  alasan: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  catatan_baak?: string;
  created_at: string;
  updated_at: string;
}

export interface RescheduleRequestPayload {
  jadwal_id: string;
  dosen_id: string;
  nidn_verification: string;
  ruangan_tujuan_id: string;
  hari_tujuan_id: number;
  slot_tujuan_id: string;
  alasan: string;
}

export interface KetersediaanDosen {
  id?: string;
  dosen_id: string;
  semester_periode_id: string;
  hari_id: number;
  slot_mulai_id: string;
  slot_selesai_id: string;
  tersedia: boolean;
  keterangan?: string;
}

export interface HariItem {
  id: number;
  kode: string;
  nama: string;
  nomor: number;
}

export interface SlotWaktuItem {
  id: string;
  nomor: number;
  jam_mulai: string;
  jam_selesai: string;
  durasi_menit: number;
}
