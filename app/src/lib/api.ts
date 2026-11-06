import {
  SemesterPeriode, Ruangan, Dosen, MataKuliah, Kelas, AturanJadwal,
  JobGA, VersiJadwal, ScheduleMatrixResponse, Prodi, Fakultas,
  HariItem, SlotWaktuItem, KetersediaanDosen
} from "./types";

const API_BASE = "/api/v1";

// ----------------- MASTER PERIODE & FAKULTAS -----------------
export async function fetchActivePeriod(): Promise<SemesterPeriode | null> {
  const res = await fetch(`${API_BASE}/master/periods`);
  if (!res.ok) return null;
  const data: SemesterPeriode[] = await res.json();
  return data.find(p => p.status === "ACTIVE") || data[0] || null;
}

export async function fetchPeriods(): Promise<SemesterPeriode[]> {
  const res = await fetch(`${API_BASE}/master/periods`);
  if (!res.ok) return [];
  return res.json();
}

export async function createPeriod(data: Partial<SemesterPeriode>): Promise<SemesterPeriode> {
  const res = await fetch(`${API_BASE}/master/periods`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal membuat periode semester");
  }
  return res.json();
}

export async function updatePeriod(id: string, data: Partial<SemesterPeriode>): Promise<SemesterPeriode> {
  const res = await fetch(`${API_BASE}/master/periods/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal memperbarui periode semester");
  }
  return res.json();
}

export async function activatePeriod(id: string): Promise<SemesterPeriode> {
  const res = await fetch(`${API_BASE}/master/periods/${id}/activate`, {
    method: "POST"
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal mengaktifkan periode semester");
  }
  return res.json();
}

export async function archivePeriod(id: string): Promise<SemesterPeriode> {
  const res = await fetch(`${API_BASE}/master/periods/${id}/archive`, {
    method: "POST"
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal mengarsipkan periode semester");
  }
  return res.json();
}

export async function deletePeriod(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/master/periods/${id}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal menghapus periode semester");
  }
}

export async function fetchFaculties(): Promise<Fakultas[]> {
  const res = await fetch(`${API_BASE}/master/faculties`);
  if (!res.ok) return [];
  return res.json();
}

// ----------------- PROGRAM STUDI (CRUD & Soft Delete) -----------------
export async function fetchDepartments(params?: { status?: string; fakultasId?: string } | string): Promise<Prodi[]> {
  const q = new URLSearchParams();
  if (typeof params === "string") {
    if (params) q.append("fakultas_id", params);
  } else if (params) {
    if (params.status) q.append("status", params.status);
    if (params.fakultasId) q.append("fakultas_id", params.fakultasId);
  }
  const queryStr = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(`${API_BASE}/master/departments${queryStr}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createDepartment(data: Partial<Prodi>): Promise<Prodi> {
  const res = await fetch(`${API_BASE}/master/departments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal menambah Program Studi");
  }
  return res.json();
}

export async function updateDepartment(id: string, data: Partial<Prodi>): Promise<Prodi> {
  const res = await fetch(`${API_BASE}/master/departments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal mengubah Program Studi");
  }
  return res.json();
}

export async function softDeleteDepartment(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/master/departments/${id}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal menonaktifkan Program Studi");
  }
}

export async function restoreDepartment(id: string): Promise<Prodi> {
  const res = await fetch(`${API_BASE}/master/departments/${id}/restore`, {
    method: "PATCH"
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal memulihkan Program Studi");
  }
  return res.json();
}

// ----------------- RUANGAN (CRUD & Soft Delete) -----------------
export async function fetchRooms(params?: { status?: string; jenis?: string; gedung?: string }): Promise<Ruangan[]> {
  const q = new URLSearchParams();
  if (params?.status) q.append("status", params.status);
  if (params?.jenis) q.append("jenis", params.jenis);
  if (params?.gedung) q.append("gedung", params.gedung);
  const queryStr = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(`${API_BASE}/master/rooms${queryStr}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createRoom(data: Partial<Ruangan>): Promise<Ruangan> {
  const res = await fetch(`${API_BASE}/master/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal menambah ruangan");
  }
  return res.json();
}

export async function updateRoom(id: string, data: Partial<Ruangan>): Promise<Ruangan> {
  const res = await fetch(`${API_BASE}/master/rooms/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal mengubah ruangan");
  }
  return res.json();
}

export async function softDeleteRoom(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/master/rooms/${id}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal menonaktifkan ruangan");
  }
}

export async function restoreRoom(id: string): Promise<Ruangan> {
  const res = await fetch(`${API_BASE}/master/rooms/${id}/restore`, {
    method: "PATCH"
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal memulihkan ruangan");
  }
  return res.json();
}

// ----------------- DOSEN (CRUD & Soft Delete) -----------------
export async function fetchLecturers(params?: { status?: string; prodiId?: string }): Promise<Dosen[]> {
  const q = new URLSearchParams();
  if (params?.status) q.append("status", params.status);
  if (params?.prodiId) q.append("prodi_id", params.prodiId);
  const queryStr = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(`${API_BASE}/academic/lecturers${queryStr}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createLecturer(data: Partial<Dosen>): Promise<Dosen> {
  const res = await fetch(`${API_BASE}/academic/lecturers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal menambah dosen");
  }
  return res.json();
}

export async function updateLecturer(id: string, data: Partial<Dosen>): Promise<Dosen> {
  const res = await fetch(`${API_BASE}/academic/lecturers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal mengubah dosen");
  }
  return res.json();
}

export async function softDeleteLecturer(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/academic/lecturers/${id}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal menonaktifkan dosen");
  }
}

export async function restoreLecturer(id: string): Promise<Dosen> {
  const res = await fetch(`${API_BASE}/academic/lecturers/${id}/restore`, {
    method: "PATCH"
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal memulihkan dosen");
  }
  return res.json();
}

// ----------------- MATA KULIAH (CRUD & Soft Delete) -----------------
export async function fetchCourses(params?: { status?: string; jenis?: string; prodiId?: string }): Promise<MataKuliah[]> {
  const q = new URLSearchParams();
  if (params?.status) q.append("status", params.status);
  if (params?.jenis) q.append("jenis", params.jenis);
  if (params?.prodiId) q.append("prodi_id", params.prodiId);
  const queryStr = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(`${API_BASE}/academic/courses${queryStr}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createCourse(data: Partial<MataKuliah>): Promise<MataKuliah> {
  const res = await fetch(`${API_BASE}/academic/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal menambah mata kuliah");
  }
  return res.json();
}

export async function updateCourse(id: string, data: Partial<MataKuliah>): Promise<MataKuliah> {
  const res = await fetch(`${API_BASE}/academic/courses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal mengubah mata kuliah");
  }
  return res.json();
}

export async function softDeleteCourse(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/academic/courses/${id}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal menonaktifkan mata kuliah");
  }
}

export async function restoreCourse(id: string): Promise<MataKuliah> {
  const res = await fetch(`${API_BASE}/academic/courses/${id}/restore`, {
    method: "PATCH"
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal memulihkan mata kuliah");
  }
  return res.json();
}

// ----------------- ROMBEL KELAS (CRUD & Soft Delete) -----------------
export async function fetchClasses(params?: { status?: string; periodeId?: string; prodiId?: string }): Promise<Kelas[]> {
  const q = new URLSearchParams();
  if (params?.status) q.append("status", params.status);
  if (params?.periodeId) q.append("periode_id", params.periodeId);
  if (params?.prodiId) q.append("prodi_id", params.prodiId);
  const queryStr = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(`${API_BASE}/academic/classes${queryStr}`);
  if (!res.ok) return [];
  return res.json();
}

export async function createClass(data: any): Promise<Kelas> {
  const res = await fetch(`${API_BASE}/academic/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal menambah rombel kelas");
  }
  return res.json();
}

export async function updateClass(id: string, data: any): Promise<Kelas> {
  const res = await fetch(`${API_BASE}/academic/classes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal mengubah rombel kelas");
  }
  return res.json();
}

export async function softDeleteClass(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/academic/classes/${id}`, {
    method: "DELETE"
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal membatalkan rombel kelas");
  }
}

export async function restoreClass(id: string): Promise<Kelas> {
  const res = await fetch(`${API_BASE}/academic/classes/${id}/restore`, {
    method: "PATCH"
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal mengaktifkan kembali rombel kelas");
  }
  return res.json();
}

// ----------------- ATURAN & BOBOT -----------------
export async function fetchRules(): Promise<AturanJadwal[]> {
  const res = await fetch(`${API_BASE}/constraints/rules`);
  if (!res.ok) return [];
  return res.json();
}

export async function updateRuleWeight(ruleId: string, bobot: number, aktif: boolean): Promise<AturanJadwal | null> {
  const res = await fetch(`${API_BASE}/constraints/rules/${ruleId}?bobot=${bobot}&aktif=${aktif}`, {
    method: "PUT"
  });
  if (!res.ok) return null;
  return res.json();
}

// ----------------- GA & JADWAL -----------------
export async function fetchScheduleVersions(periodeId?: string): Promise<VersiJadwal[]> {
  const url = periodeId ? `${API_BASE}/ga/versions?periode_id=${periodeId}` : `${API_BASE}/ga/versions`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchScheduleMatrix(
  versionId: string,
  viewBy: "room" | "lecturer" | "class" = "room",
  filterId?: string
): Promise<ScheduleMatrixResponse | null> {
  let url = `${API_BASE}/ga/versions/${versionId}/matrix?view_by=${viewBy}`;
  if (filterId) url += `&filter_id=${filterId}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

export async function triggerGAJob(payload: {
  semester_periode_id: string;
  populasi: number;
  generasi: number;
  mutation_rate: number;
  crossover_rate: number;
}): Promise<JobGA | null> {
  const res = await fetch(`${API_BASE}/ga/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchJobStatus(jobId: string): Promise<JobGA | null> {
  const res = await fetch(`${API_BASE}/ga/jobs/${jobId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function adjustScheduleItem(
  jadwalId: string,
  payload: { ruangan_id: string; hari_id: number; slot_mulai_id: string }
): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/ga/items/${jadwalId}/adjust`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    return { success: false, message: err.detail || "Gagal memindahkan jadwal." };
  }
  return { success: true };
}

export async function publishScheduleVersion(versionId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/ga/versions/${versionId}/publish`, {
    method: "POST"
  });
  return res.ok;
}

// ----------------- EXCEL EXPORT / IMPORT -----------------
export async function uploadExcelData(file: File, semesterPeriodeId: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("semester_periode_id", semesterPeriodeId);

  const res = await fetch(`${API_BASE}/excel/upload`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal mengunggah file Excel.");
  }
  return res.json();
}

export function getExcelTemplateUrl(): string {
  return `${API_BASE}/excel/template`;
}

export function getExportScheduleUrl(versionId: string): string {
  return `${API_BASE}/ga/versions/${versionId}/export-excel`;
}

// ----------------- AUTENTIKASI ADMIN -----------------
export async function loginAdmin(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Login gagal. Periksa username dan password.");
  }
  return res.json();
}

export async function fetchCurrentUser(token: string) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return res.json();
}

// ----------------- PORTAL PUBLIK & QR CODE SCAN -----------------
export async function fetchPublicActiveSchedule(params?: { prodiId?: string; hariId?: number; ruanganId?: string }) {
  const q = new URLSearchParams();
  if (params?.prodiId) q.append("prodi_id", params.prodiId);
  if (params?.hariId) q.append("hari_id", params.hariId.toString());
  if (params?.ruanganId) q.append("ruangan_id", params.ruanganId);
  const qs = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(`${API_BASE}/public/schedule/active${qs}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPublicRoomSchedule(kodeRuang: string) {
  const res = await fetch(`${API_BASE}/public/room/${encodeURIComponent(kodeRuang)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Jadwal ruangan tidak ditemukan.");
  }
  return res.json();
}

export async function fetchPublicClassSchedule(kodeKelas: string) {
  const res = await fetch(`${API_BASE}/public/class/${encodeURIComponent(kodeKelas)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Jadwal rombel kelas tidak ditemukan.");
  }
  return res.json();
}

export async function fetchPublicLecturerSchedule(lecturerId: string) {
  const res = await fetch(`${API_BASE}/public/lecturer/${encodeURIComponent(lecturerId)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Jadwal dosen tidak ditemukan.");
  }
  return res.json();
}

// ----------------- PERMOHONAN GANTI JADWAL (RESCHEDULE) -----------------
export async function fetchAvailableRescheduleSlots(jadwalId: string, dosenId: string) {
  const res = await fetch(`${API_BASE}/reschedule/available-slots?jadwal_id=${encodeURIComponent(jadwalId)}&dosen_id=${encodeURIComponent(dosenId)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal mencari slot kosong.");
  }
  return res.json();
}

export async function submitRescheduleRequest(payload: any) {
  const res = await fetch(`${API_BASE}/reschedule/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal mengajukan permohonan ganti jadwal.");
  }
  return res.json();
}

export async function fetchRescheduleRequests(statusFilter: string = "ALL") {
  const res = await fetch(`${API_BASE}/reschedule/requests?status_filter=${encodeURIComponent(statusFilter)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function reviewRescheduleRequest(requestId: string, payload: { status: string; catatan_baak?: string }) {
  const res = await fetch(`${API_BASE}/reschedule/requests/${encodeURIComponent(requestId)}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal memproses permohonan.");
  }
  return res.json();
}

// ----------------- KETERSEDIAAN WAKTU DOSEN & MASTER WAKTU -----------------
export async function fetchDays(): Promise<HariItem[]> {
  const res = await fetch(`${API_BASE}/master/days`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchTimeSlots(): Promise<SlotWaktuItem[]> {
  const res = await fetch(`${API_BASE}/master/time-slots`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchLecturerAvailabilities(dosenId: string, periodeId: string): Promise<KetersediaanDosen[]> {
  const res = await fetch(`${API_BASE}/constraints/lecturer-availabilities?dosen_id=${encodeURIComponent(dosenId)}&periode_id=${encodeURIComponent(periodeId)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function saveBulkLecturerAvailabilities(payload: {
  dosen_id: string;
  semester_periode_id: string;
  items: Array<{ hari_id: number; slot_id: string; tersedia: boolean }>;
}) {
  const res = await fetch(`${API_BASE}/constraints/lecturer-availabilities/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Gagal menyimpan ketersediaan waktu dosen.");
  }
  return res.json();
}
