"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { 
  Database, GraduationCap, Building2, Users, BookOpen, Layers, 
  Search, RefreshCw, Plus, Pencil, Trash2, RotateCcw, 
  X, Check, AlertTriangle, Filter, QrCode, Printer, ExternalLink,
  CalendarRange, CheckCircle2, Archive, Star, Clock, Ban
} from "lucide-react";
import { 
  fetchDepartments, createDepartment, updateDepartment, softDeleteDepartment, restoreDepartment,
  fetchRooms, createRoom, updateRoom, softDeleteRoom, restoreRoom,
  fetchLecturers, createLecturer, updateLecturer, softDeleteLecturer, restoreLecturer,
  fetchCourses, createCourse, updateCourse, softDeleteCourse, restoreCourse,
  fetchClasses, createClass, updateClass, softDeleteClass, restoreClass,
  fetchFaculties, fetchPeriods, createPeriod, updatePeriod, activatePeriod, archivePeriod, deletePeriod,
  fetchDays, fetchTimeSlots, fetchLecturerAvailabilities, saveBulkLecturerAvailabilities
} from "@/lib/api";
import { Prodi, Fakultas, Ruangan, Dosen, MataKuliah, Kelas, SemesterPeriode, HariItem, SlotWaktuItem } from "@/lib/types";

type ActiveTab = "periods" | "prodis" | "rooms" | "lecturers" | "courses" | "classes";
type StatusFilter = "active" | "inactive" | "all";

export default function MasterPage() {
  const [tab, setTab] = useState<ActiveTab>("prodis");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  
  // Data lists
  const [prodis, setProdis] = useState<Prodi[]>([]);
  const [faculties, setFaculties] = useState<Fakultas[]>([]);
  const [rooms, setRooms] = useState<Ruangan[]>([]);
  const [lecturers, setLecturers] = useState<Dosen[]>([]);
  const [courses, setCourses] = useState<MataKuliah[]>([]);
  const [classes, setClasses] = useState<Kelas[]>([]);
  const [periods, setPeriods] = useState<SemesterPeriode[]>([]);

  // Category filters
  const [filterFakultasId, setFilterFakultasId] = useState<string>("");
  const [filterJenisRuang, setFilterJenisRuang] = useState<string>("");
  const [filterProdiId, setFilterProdiId] = useState<string>("");
  const [filterJenisMK, setFilterJenisMK] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Soft Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: ActiveTab } | null>(null);

  // Lecturer Availability Modal State
  const [availModalLecturer, setAvailModalLecturer] = useState<Dosen | null>(null);
  const [days, setDays] = useState<HariItem[]>([]);
  const [timeSlots, setTimeSlots] = useState<SlotWaktuItem[]>([]);
  const [unavailableSlotKeys, setUnavailableSlotKeys] = useState<Set<string>>(new Set()); // "hariId_slotId"
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [savingAvail, setSavingAvail] = useState(false);

  // QR Code Generator Modal
  const [qrModalData, setQrModalData] = useState<{
    type: "ruang" | "kelas" | "dosen";
    title: string;
    subtitle: string;
    code: string;
    url: string;
    dataUrl: string;
  } | null>(null);

  const handleOpenRoomQr = async (r: Ruangan) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const targetUrl = `${origin}/jadwal/ruang/${encodeURIComponent(r.kode)}`;
    try {
      const dataUrl = await QRCode.toDataURL(targetUrl, {
        width: 320,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" }
      });
      setQrModalData({
        type: "ruang",
        title: r.nama,
        subtitle: `${r.gedung || "Gedung Perkuliahan"} • Lantai ${r.lantai} • Kapasitas ${r.kapasitas} Kursi`,
        code: r.kode,
        url: targetUrl,
        dataUrl
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenLecturerQr = async (l: Dosen) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const targetUrl = `${origin}/jadwal/dosen/${l.id}`;
    try {
      const dataUrl = await QRCode.toDataURL(targetUrl, {
        width: 320,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" }
      });
      setQrModalData({
        type: "dosen",
        title: l.nama_lengkap,
        subtitle: l.email || "Dosen Pengampu UNU",
        code: l.nidn || l.nama,
        url: targetUrl,
        dataUrl
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenClassQr = async (cl: Kelas) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const targetUrl = `${origin}/jadwal/kelas/${encodeURIComponent(cl.kode_kelas)}`;
    try {
      const dataUrl = await QRCode.toDataURL(targetUrl, {
        width: 320,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" }
      });
      setQrModalData({
        type: "kelas",
        title: cl.nama_kelas,
        subtitle: `${cl.sks} SKS • ${cl.jumlah_mahasiswa} Mahasiswa`,
        code: cl.kode_kelas,
        url: targetUrl,
        dataUrl
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Initial load meta (faculties, periods, and active prodis for dropdowns)
  const loadMeta = async () => {
    try {
      const [facList, periodList, depList] = await Promise.all([
        fetchFaculties(),
        fetchPeriods(),
        fetchDepartments({ status: "active" })
      ]);
      setFaculties(facList);
      setPeriods(periodList);
      if (tab !== "prodis") {
        setProdis(depList);
      }
    } catch (err) {
      console.error("Meta load error", err);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  // Load Tab Data
  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === "periods") {
        const data = await fetchPeriods();
        setPeriods(data);
      } else if (tab === "prodis") {
        const data = await fetchDepartments({
          status: statusFilter,
          fakultasId: filterFakultasId || undefined
        });
        setProdis(data);
      } else if (tab === "rooms") {
        const data = await fetchRooms({ 
          status: statusFilter, 
          jenis: filterJenisRuang || undefined 
        });
        setRooms(data);
      } else if (tab === "lecturers") {
        const data = await fetchLecturers({ 
          status: statusFilter, 
          prodiId: filterProdiId || undefined 
        });
        setLecturers(data);
      } else if (tab === "courses") {
        const data = await fetchCourses({ 
          status: statusFilter, 
          jenis: filterJenisMK || undefined, 
          prodiId: filterProdiId || undefined 
        });
        setCourses(data);
      } else if (tab === "classes") {
        const data = await fetchClasses({ 
          status: statusFilter, 
          prodiId: filterProdiId || undefined 
        });
        setClasses(data);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Gagal memuat data master." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tab, statusFilter, filterFakultasId, filterJenisRuang, filterProdiId, filterJenisMK]);

  const showNotification = (type: "success" | "error", text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // ----------------- CRUD ACTION HANDLERS -----------------
  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleConfirmSoftDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      if (deleteTarget.type === "periods") {
        await deletePeriod(deleteTarget.id);
      } else if (deleteTarget.type === "prodis") {
        await softDeleteDepartment(deleteTarget.id);
      } else if (deleteTarget.type === "rooms") {
        await softDeleteRoom(deleteTarget.id);
      } else if (deleteTarget.type === "lecturers") {
        await softDeleteLecturer(deleteTarget.id);
      } else if (deleteTarget.type === "courses") {
        await softDeleteCourse(deleteTarget.id);
      } else if (deleteTarget.type === "classes") {
        await softDeleteClass(deleteTarget.id);
      }
      showNotification("success", `Data "${deleteTarget.name}" berhasil diproses.`);
      setDeleteTarget(null);
      await loadData();
      await loadMeta();
      window.dispatchEvent(new Event("period-changed"));
    } catch (err: any) {
      showNotification("error", err.message || "Gagal memproses data.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivatePeriod = async (id: string, name: string) => {
    try {
      await activatePeriod(id);
      showNotification("success", `Periode "${name}" sekarang menjadi PERIODE AKTIF.`);
      await loadData();
      await loadMeta();
      window.dispatchEvent(new Event("period-changed"));
    } catch (err: any) {
      showNotification("error", err.message || "Gagal mengaktifkan periode.");
    }
  };

  const handleArchivePeriod = async (id: string, name: string) => {
    try {
      await archivePeriod(id);
      showNotification("success", `Periode "${name}" telah diarsipkan.`);
      await loadData();
      await loadMeta();
      window.dispatchEvent(new Event("period-changed"));
    } catch (err: any) {
      showNotification("error", err.message || "Gagal mengarsipkan periode.");
    }
  };

  // ----------------- LECTURER AVAILABILITY HANDLERS -----------------
  const handleOpenAvailabilityModal = async (lecturer: Dosen) => {
    setAvailModalLecturer(lecturer);
    setLoadingAvail(true);
    try {
      const activeP = periods.find(p => p.status === "ACTIVE") || periods[0];
      if (!activeP) {
        showNotification("error", "Belum ada periode semester aktif. Silakan buat atau aktifkan periode terlebih dahulu.");
        setAvailModalLecturer(null);
        return;
      }

      const [dList, sList, avList] = await Promise.all([
        days.length > 0 ? Promise.resolve(days) : fetchDays(),
        timeSlots.length > 0 ? Promise.resolve(timeSlots) : fetchTimeSlots(),
        fetchLecturerAvailabilities(lecturer.id, activeP.id)
      ]);

      if (days.length === 0) setDays(dList);
      if (timeSlots.length === 0) setTimeSlots(sList);

      const unavail = new Set<string>();
      avList.forEach(av => {
        if (!av.tersedia) {
          unavail.add(`${av.hari_id}_${av.slot_mulai_id}`);
        }
      });
      setUnavailableSlotKeys(unavail);
    } catch (err: any) {
      showNotification("error", err.message || "Gagal memuat ketersediaan waktu dosen.");
    } finally {
      setLoadingAvail(false);
    }
  };

  const handleToggleSlotAvailability = (hariId: number, slotId: string) => {
    setUnavailableSlotKeys(prev => {
      const next = new Set(prev);
      const key = `${hariId}_${slotId}`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSetAllAvailable = () => {
    setUnavailableSlotKeys(new Set());
  };

  const handleSaveAvailability = async () => {
    if (!availModalLecturer) return;
    setSavingAvail(true);
    try {
      const activeP = periods.find(p => p.status === "ACTIVE") || periods[0];
      if (!activeP) throw new Error("Tidak ada periode aktif ditemukan");

      const items: Array<{ hari_id: number; slot_id: string; tersedia: boolean }> = [];
      days.forEach(d => {
        timeSlots.forEach(s => {
          const key = `${d.id}_${s.id}`;
          const isBusy = unavailableSlotKeys.has(key);
          items.push({
            hari_id: d.id,
            slot_id: s.id,
            tersedia: !isBusy
          });
        });
      });

      await saveBulkLecturerAvailabilities({
        dosen_id: availModalLecturer.id,
        semester_periode_id: activeP.id,
        items
      });

      showNotification("success", `Ketersediaan waktu mengajar untuk ${availModalLecturer.nama_lengkap} berhasil disimpan!`);
      setAvailModalLecturer(null);
    } catch (err: any) {
      showNotification("error", err.message || "Gagal menyimpan ketersediaan waktu dosen.");
    } finally {
      setSavingAvail(false);
    }
  };

  const handleRestore = async (id: string, name: string) => {
    try {
      if (tab === "prodis") {
        await restoreDepartment(id);
      } else if (tab === "rooms") {
        await restoreRoom(id);
      } else if (tab === "lecturers") {
        await restoreLecturer(id);
      } else if (tab === "courses") {
        await restoreCourse(id);
      } else if (tab === "classes") {
        await restoreClass(id);
      }
      showNotification("success", `Data "${name}" berhasil dipulihkan (Aktif kembali).`);
      await loadData();
      await loadMeta();
    } catch (err: any) {
      showNotification("error", err.message || "Gagal memulihkan data.");
    }
  };

  const handleSubmitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      if (tab === "periods") {
        const payload = {
          tahun_ajaran: (formData.get("tahun_ajaran") as string).trim(),
          semester: formData.get("semester") as any,
          kode: (formData.get("kode") as string)?.trim() || undefined,
          tanggal_mulai: (formData.get("tanggal_mulai") as string) || undefined,
          tanggal_selesai: (formData.get("tanggal_selesai") as string) || undefined,
          status: (formData.get("status") as any) || "DRAFT"
        };
        if (editingItem) {
          await updatePeriod(editingItem.id, payload);
          showNotification("success", "Periode semester berhasil diperbarui.");
        } else {
          await createPeriod(payload);
          showNotification("success", "Periode semester baru berhasil ditambahkan.");
        }
        window.dispatchEvent(new Event("period-changed"));
      } else if (tab === "prodis") {
        const payload = {
          kode: (formData.get("kode") as string).trim().toUpperCase(),
          nama: (formData.get("nama") as string).trim(),
          jenjang: (formData.get("jenjang") as string) || "S1",
          fakultas_id: formData.get("fakultas_id") as string,
          aktif: true
        };
        if (editingItem) {
          await updateDepartment(editingItem.id, payload);
          showNotification("success", "Program Studi berhasil diperbarui.");
        } else {
          await createDepartment(payload);
          showNotification("success", "Program Studi baru berhasil ditambahkan.");
        }
      } else if (tab === "rooms") {
        const payload = {
          kode: formData.get("kode") as string,
          nama: formData.get("nama") as string,
          gedung: formData.get("gedung") as string || undefined,
          lantai: parseInt(formData.get("lantai") as string) || 1,
          kapasitas: parseInt(formData.get("kapasitas") as string) || 40,
          jenis: formData.get("jenis") as any,
          aktif: true
        };
        if (editingItem) {
          await updateRoom(editingItem.id, payload);
          showNotification("success", "Ruangan berhasil diperbarui.");
        } else {
          await createRoom(payload);
          showNotification("success", "Ruangan baru berhasil ditambahkan.");
        }
      } else if (tab === "lecturers") {
        const payload = {
          nidn: formData.get("nidn") as string || undefined,
          nama: formData.get("nama") as string,
          gelar_depan: formData.get("gelar_depan") as string || undefined,
          gelar_belakang: formData.get("gelar_belakang") as string || undefined,
          email: formData.get("email") as string || undefined,
          prodi_id: (formData.get("prodi_id") as string) || undefined,
          aktif: true
        };
        if (editingItem) {
          await updateLecturer(editingItem.id, payload);
          showNotification("success", "Data dosen berhasil diperbarui.");
        } else {
          await createLecturer(payload);
          showNotification("success", "Dosen baru berhasil ditambahkan.");
        }
      } else if (tab === "courses") {
        const sksTotal = parseInt(formData.get("sks") as string) || 2;
        const payload = {
          kode: formData.get("kode") as string,
          nama: formData.get("nama") as string,
          sks: sksTotal,
          teori_sks: parseInt(formData.get("teori_sks") as string) || sksTotal,
          praktik_sks: parseInt(formData.get("praktik_sks") as string) || 0,
          jenis: formData.get("jenis") as any,
          prodi_id: formData.get("prodi_id") as string,
          semester_rekomendasi: parseInt(formData.get("semester_rekomendasi") as string) || 1,
          aktif: true
        };
        if (editingItem) {
          await updateCourse(editingItem.id, payload);
          showNotification("success", "Mata kuliah berhasil diperbarui.");
        } else {
          await createCourse(payload);
          showNotification("success", "Mata kuliah baru berhasil ditambahkan.");
        }
      } else if (tab === "classes") {
        const dosenId = formData.get("dosen_id") as string;
        const payload = {
          kode_kelas: formData.get("kode_kelas") as string,
          nama_kelas: formData.get("nama_kelas") as string,
          mata_kuliah_id: formData.get("mata_kuliah_id") as string,
          prodi_id: formData.get("prodi_id") as string,
          semester_periode_id: formData.get("semester_periode_id") as string,
          semester_ke: parseInt(formData.get("semester_ke") as string) || 1,
          jumlah_mahasiswa: parseInt(formData.get("jumlah_mahasiswa") as string) || 30,
          sks: parseInt(formData.get("sks") as string) || 2,
          jenis: formData.get("jenis") as any,
          status: "ACTIVE",
          dosen_ids: dosenId ? [dosenId] : []
        };
        if (editingItem) {
          await updateClass(editingItem.id, payload);
          showNotification("success", "Rombel kelas berhasil diperbarui.");
        } else {
          await createClass(payload);
          showNotification("success", "Rombel kelas baru berhasil ditambahkan.");
        }
      }

      setIsModalOpen(false);
      setEditingItem(null);
      await loadData();
      await loadMeta();
    } catch (err: any) {
      showNotification("error", err.message || "Gagal menyimpan data.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Client-Side Search
  const filteredPeriods = useMemo(() => {
    return periods.filter(pe =>
      pe.kode.toLowerCase().includes(search.toLowerCase()) ||
      pe.tahun_ajaran.toLowerCase().includes(search.toLowerCase()) ||
      pe.semester.toLowerCase().includes(search.toLowerCase())
    );
  }, [periods, search]);

  const filteredProdis = useMemo(() => {
    return prodis.filter(p => 
      p.kode.toLowerCase().includes(search.toLowerCase()) || 
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      (p.jenjang && p.jenjang.toLowerCase().includes(search.toLowerCase())) ||
      (p.fakultas?.nama && p.fakultas.nama.toLowerCase().includes(search.toLowerCase()))
    );
  }, [prodis, search]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => 
      r.kode.toLowerCase().includes(search.toLowerCase()) || 
      r.nama.toLowerCase().includes(search.toLowerCase()) ||
      (r.gedung && r.gedung.toLowerCase().includes(search.toLowerCase()))
    );
  }, [rooms, search]);

  const filteredLecturers = useMemo(() => {
    return lecturers.filter(l => 
      l.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
      (l.nidn && l.nidn.includes(search)) ||
      (l.email && l.email.toLowerCase().includes(search.toLowerCase()))
    );
  }, [lecturers, search]);

  const filteredCourses = useMemo(() => {
    return courses.filter(c => 
      c.kode.toLowerCase().includes(search.toLowerCase()) || 
      c.nama.toLowerCase().includes(search.toLowerCase())
    );
  }, [courses, search]);

  const filteredClasses = useMemo(() => {
    return classes.filter(cl => 
      cl.kode_kelas.toLowerCase().includes(search.toLowerCase()) || 
      cl.nama_kelas.toLowerCase().includes(search.toLowerCase())
    );
  }, [classes, search]);

  return (
    <div className="w-full space-y-6">
      {/* Toast Alert Notification */}
      {feedbackMsg && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all border ${
          feedbackMsg.type === "success" 
            ? "bg-emerald-50 text-emerald-900 border-emerald-300" 
            : "bg-rose-50 text-rose-900 border-rose-300"
        }`}>
          {feedbackMsg.type === "success" ? <Check className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Database className="w-7 h-7 text-indigo-600" />
            <span>Master Data Akademik</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manajemen entitas perkuliahan UNU: Program Studi, Ruangan, Dosen, Mata Kuliah, dan Rombel Kelas dengan dukungan Soft Delete.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/master/stiker-ruang"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all hover:shadow"
          >
            <QrCode className="w-4 h-4 text-emerald-200" />
            <span>🖨️ Cetak Stiker QR Pintu Ruangan</span>
          </Link>

          <button
            onClick={loadData}
            title="Muat ulang data"
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>
              Tambah {
                tab === "periods" ? "Periode Semester" :
                tab === "prodis" ? "Program Studi" : 
                tab === "rooms" ? "Ruangan" : 
                tab === "lecturers" ? "Dosen" : 
                tab === "courses" ? "Mata Kuliah" : "Rombel Kelas"
              }
            </span>
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex bg-slate-200/80 p-1.5 rounded-xl w-fit flex-wrap gap-1">
        <button
          onClick={() => { setTab("periods"); setSearch(""); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            tab === "periods" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          <span>Periode Semester ({periods.length})</span>
        </button>

        <button
          onClick={() => { setTab("prodis"); setSearch(""); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            tab === "prodis" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Program Studi ({prodis.length})</span>
        </button>

        <button
          onClick={() => { setTab("rooms"); setSearch(""); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            tab === "rooms" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Ruangan ({rooms.length})</span>
        </button>

        <button
          onClick={() => { setTab("lecturers"); setSearch(""); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            tab === "lecturers" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Dosen ({lecturers.length})</span>
        </button>

        <button
          onClick={() => { setTab("courses"); setSearch(""); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            tab === "courses" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Mata Kuliah ({courses.length})</span>
        </button>

        <button
          onClick={() => { setTab("classes"); setSearch(""); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            tab === "classes" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Rombel Kelas ({classes.length})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left: Status Filter Pills & Specific Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <span className="text-slate-500 px-2 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "active" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "inactive" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Nonaktif (Soft Deleted)
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === "all" ? "bg-slate-700 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua
            </button>
          </div>

          {/* Tab-Specific Dropdown Filters */}
          {tab === "prodis" && faculties.length > 0 && (
            <select
              value={filterFakultasId}
              onChange={(e) => setFilterFakultasId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Fakultas</option>
              {faculties.map(f => (
                <option key={f.id} value={f.id}>{f.kode} - {f.nama}</option>
              ))}
            </select>
          )}

          {tab === "rooms" && (
            <select
              value={filterJenisRuang}
              onChange={(e) => setFilterJenisRuang(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Jenis Ruangan</option>
              <option value="KELAS">Ruang Teori (Kelas)</option>
              <option value="LABORATORIUM">Laboratorium Komputer/Sains</option>
              <option value="GAZEBO">Gazebo / Outdoor</option>
              <option value="AULA">Aula Utama</option>
            </select>
          )}

          {(tab === "lecturers" || tab === "courses" || tab === "classes") && prodis.length > 0 && (
            <select
              value={filterProdiId}
              onChange={(e) => setFilterProdiId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 max-w-xs truncate"
            >
              <option value="">Semua Program Studi</option>
              {prodis.map(p => (
                <option key={p.id} value={p.id}>{p.jenjang} {p.nama} ({p.kode})</option>
              ))}
            </select>
          )}

          {tab === "courses" && (
            <select
              value={filterJenisMK}
              onChange={(e) => setFilterJenisMK(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Tipe Mata Kuliah</option>
              <option value="TEORI">Teori</option>
              <option value="PRAKTIK">Praktikum</option>
            </select>
          )}
        </div>

        {/* Right: Search Box */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari kode, nama, pengampu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50"
          />
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex justify-center items-center gap-2 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Memuat data master akademik...</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {/* TAB 0: PERIODE SEMESTER */}
          {tab === "periods" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Kode Periode</th>
                    <th className="p-4">Tahun Ajaran</th>
                    <th className="p-4 text-center">Semester</th>
                    <th className="p-4">Rentang Waktu Perkuliahan</th>
                    <th className="p-4 text-center">Status Operasional</th>
                    <th className="p-4 text-center">Aksi &amp; Kontrol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPeriods.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400">
                        Tidak ada data Periode Semester ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredPeriods.map((pe) => {
                      const isActive = pe.status === "ACTIVE";
                      const isArchived = pe.status === "CLOSED" || pe.status === "ARCHIVED";
                      return (
                        <tr key={pe.id} className={`hover:bg-slate-50 transition-colors ${isActive ? "bg-emerald-50/40" : ""}`}>
                          <td className="p-4 font-mono font-bold text-slate-900">
                            <span className={`px-2.5 py-1 rounded-md border ${
                              isActive 
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold" 
                                : "bg-slate-100 text-slate-800 border-slate-200"
                            }`}>
                              {pe.kode}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-800 text-sm">
                            Tahun {pe.tahun_ajaran}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              pe.semester === "GASAL" 
                                ? "bg-blue-100 text-blue-800 border border-blue-200" 
                                : "bg-purple-100 text-purple-800 border border-purple-200"
                            }`}>
                              Semester {pe.semester}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">
                            {pe.tanggal_mulai && pe.tanggal_selesai ? (
                              <span>{pe.tanggal_mulai} s/d {pe.tanggal_selesai}</span>
                            ) : (
                              <span className="text-slate-400 italic">Tanggal belum ditentukan</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                                AKTIF (BERJALAN)
                              </span>
                            ) : isArchived ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <Archive className="w-3 h-3 text-slate-400" />
                                Diarsipkan (Lampau)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Draft Persiapan
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {!isActive && (
                                <button
                                  onClick={() => handleActivatePeriod(pe.id, `${pe.semester} ${pe.tahun_ajaran}`)}
                                  title="Jadikan semester aktif saat ini"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95"
                                >
                                  <Star className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Aktifkan</span>
                                </button>
                              )}
                              {isActive && (
                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                                  Sedang Digunakan
                                </span>
                              )}
                              {!isActive && !isArchived && (
                                <button
                                  onClick={() => handleArchivePeriod(pe.id, `${pe.semester} ${pe.tahun_ajaran}`)}
                                  title="Arsipkan semester ini"
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEdit(pe)}
                                title="Edit Periode"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {!isActive && (
                                <button
                                  onClick={() => setDeleteTarget({ id: pe.id, name: `${pe.semester} ${pe.tahun_ajaran}`, type: "periods" })}
                                  title="Hapus Periode"
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 1: PROGRAM STUDI */}
          {tab === "prodis" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Kode Prodi</th>
                    <th className="p-4">Nama Program Studi</th>
                    <th className="p-4 text-center">Jenjang</th>
                    <th className="p-4">Fakultas Naungan</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProdis.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400">
                        Tidak ada data Program Studi ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredProdis.map((p) => {
                      const isInactive = p.aktif === false;
                      return (
                        <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${isInactive ? "bg-rose-50/30" : ""}`}>
                          <td className="p-4 font-mono font-bold text-slate-900">
                            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                              {p.kode}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-800 text-sm">{p.nama}</td>
                          <td className="p-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {p.jenjang || "S1"}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">
                            {p.fakultas ? (
                              <span>
                                <span className="font-semibold text-slate-800">{p.fakultas.kode}</span> - {p.fakultas.nama}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Fakultas Umum / Sains & Teknologi</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {isInactive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                Nonaktif (Soft Deleted)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Aktif
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Program Studi"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {isInactive ? (
                                <button
                                  onClick={() => handleRestore(p.id, p.nama)}
                                  title="Pulihkan Program Studi"
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center gap-1 font-semibold text-[11px] px-2"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Pulihkan</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setDeleteTarget({ id: p.id, name: p.nama, type: "prodis" })}
                                  title="Soft Delete (Nonaktifkan)"
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 1: RUANGAN */}
          {tab === "rooms" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Kode</th>
                    <th className="p-4">Nama Ruangan</th>
                    <th className="p-4">Gedung / Lokasi</th>
                    <th className="p-4 text-center">Kapasitas</th>
                    <th className="p-4 text-center">Tipe</th>
                    <th className="p-4 text-center">Stiker QR Pintu</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400">
                        Tidak ada data ruangan ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map((r) => {
                      const isInactive = r.aktif === false;
                      return (
                        <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${isInactive ? "bg-rose-50/30" : ""}`}>
                          <td className="p-4 font-mono font-bold text-slate-900">{r.kode}</td>
                          <td className="p-4 font-medium text-slate-800">{r.nama}</td>
                          <td className="p-4 text-slate-600">
                            {r.gedung || "-"} <span className="text-slate-400 font-normal">(Lt. {r.lantai})</span>
                          </td>
                          <td className="p-4 text-center font-bold text-slate-800">{r.kapasitas} Kursi</td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              r.jenis === "LABORATORIUM"
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : r.jenis === "GAZEBO"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}>
                              {r.jenis}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleOpenRoomQr(r)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold border border-emerald-200 text-xs shadow-xs transition-all hover:scale-105 active:scale-95"
                              title="Cetak Barcode / QR Pintu Ruangan"
                            >
                              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Cetak QR Pintu</span>
                            </button>
                          </td>
                          <td className="p-4 text-center">
                            {isInactive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                Nonaktif (Soft Deleted)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Aktif
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(r)}
                                title="Edit Ruangan"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {isInactive ? (
                                <button
                                  onClick={() => handleRestore(r.id, r.nama)}
                                  title="Pulihkan / Aktifkan Kembali"
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center gap-1 font-semibold text-[11px] px-2"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Pulihkan</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setDeleteTarget({ id: r.id, name: r.nama, type: "rooms" })}
                                  title="Soft Delete (Nonaktifkan)"
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: DOSEN */}
          {tab === "lecturers" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">NIDN</th>
                    <th className="p-4">Nama Lengkap & Gelar</th>
                    <th className="p-4">Email Akademik</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLecturers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400">
                        Tidak ada data dosen ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredLecturers.map((l) => {
                      const isInactive = l.aktif === false;
                      return (
                        <tr key={l.id} className={`hover:bg-slate-50 transition-colors ${isInactive ? "bg-rose-50/30" : ""}`}>
                          <td className="p-4 font-mono text-slate-600 font-medium">{l.nidn || "-"}</td>
                          <td className="p-4 font-bold text-slate-900">{l.nama_lengkap}</td>
                          <td className="p-4 text-slate-500">{l.email || "-"}</td>
                          <td className="p-4 text-center">
                            {isInactive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                Nonaktif (Soft Deleted)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Aktif
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenAvailabilityModal(l)}
                                title="Atur Ketersediaan Waktu / Jam Sibuk Dosen (Hard Constraint bagi GA)"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 text-[11px] shadow-xs transition-all active:scale-95"
                              >
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Jam Sibuk</span>
                              </button>
                              <button
                                onClick={() => handleOpenLecturerQr(l)}
                                title="Cetak Barcode / QR Dosen"
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 transition-colors"
                              >
                                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(l)}
                                title="Edit Dosen"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {isInactive ? (
                                <button
                                  onClick={() => handleRestore(l.id, l.nama_lengkap)}
                                  title="Pulihkan Dosen"
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center gap-1 font-semibold text-[11px] px-2"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Pulihkan</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setDeleteTarget({ id: l.id, name: l.nama_lengkap, type: "lecturers" })}
                                  title="Soft Delete (Nonaktifkan)"
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: MATA KULIAH */}
          {tab === "courses" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Kode MK</th>
                    <th className="p-4">Nama Mata Kuliah</th>
                    <th className="p-4 text-center">Total SKS</th>
                    <th className="p-4 text-center">Komposisi (T/P)</th>
                    <th className="p-4 text-center">Tipe MK</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCourses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        Tidak ada data mata kuliah ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredCourses.map((c) => {
                      const isInactive = c.aktif === false;
                      return (
                        <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${isInactive ? "bg-rose-50/30" : ""}`}>
                          <td className="p-4 font-mono font-bold text-slate-900">{c.kode}</td>
                          <td className="p-4 font-medium text-slate-800">{c.nama}</td>
                          <td className="p-4 text-center font-bold text-slate-900">{c.sks} SKS</td>
                          <td className="p-4 text-center text-slate-500 font-mono">
                            {c.teori_sks ?? c.sks} Teori / {c.praktik_sks ?? 0} Praktik
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.jenis === "PRAKTIK" ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}>
                              {c.jenis}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {isInactive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                Nonaktif (Soft Deleted)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Aktif
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(c)}
                                title="Edit Mata Kuliah"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {isInactive ? (
                                <button
                                  onClick={() => handleRestore(c.id, c.nama)}
                                  title="Pulihkan Mata Kuliah"
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center gap-1 font-semibold text-[11px] px-2"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Pulihkan</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setDeleteTarget({ id: c.id, name: c.nama, type: "courses" })}
                                  title="Soft Delete (Nonaktifkan)"
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: ROMBEL KELAS */}
          {tab === "classes" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Kode Rombel</th>
                    <th className="p-4">Nama Kelas</th>
                    <th className="p-4">Dosen Pengampu</th>
                    <th className="p-4 text-center">Bobot SKS</th>
                    <th className="p-4 text-center">Kapasitas Mhs</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClasses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        Tidak ada data rombel kelas ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredClasses.map((cl) => {
                      const dosenList = cl.pengampu_list?.map(p => p.dosen?.nama_lengkap).filter(Boolean) || [];
                      const isCancelled = cl.status === "CANCELLED";
                      return (
                        <tr key={cl.id} className={`hover:bg-slate-50 transition-colors ${isCancelled ? "bg-rose-50/30" : ""}`}>
                          <td className="p-4 font-bold text-slate-900">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] border border-slate-200">
                              {cl.kode_kelas}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-slate-800">{cl.nama_kelas}</td>
                          <td className="p-4 text-slate-600">
                            {dosenList.length > 0 ? (
                              <span className="font-medium text-slate-700">{dosenList.join(" & ")}</span>
                            ) : (
                              <span className="text-slate-400 italic">Belum ditentukan</span>
                            )}
                          </td>
                          <td className="p-4 text-center font-bold text-slate-800">{cl.sks} SKS</td>
                          <td className="p-4 text-center font-bold text-blue-700">{cl.jumlah_mahasiswa} Mhs</td>
                          <td className="p-4 text-center">
                            {isCancelled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                Dibatalkan (Soft Deleted)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Aktif
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenClassQr(cl)}
                                title="Cetak Barcode / QR Rombel Kelas"
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 transition-colors"
                              >
                                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(cl)}
                                title="Edit Rombel Kelas"
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {isCancelled ? (
                                <button
                                  onClick={() => handleRestore(cl.id, cl.nama_kelas)}
                                  title="Aktifkan Kembali Rombel"
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center gap-1 font-semibold text-[11px] px-2"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Pulihkan</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setDeleteTarget({ id: cl.id, name: cl.nama_kelas, type: "classes" })}
                                  title="Batalkan / Soft Delete"
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL FORM: CREATE / EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>
                  {editingItem ? "Edit Data" : "Tambah Data"} {
                    tab === "periods" ? "Periode Semester" :
                    tab === "prodis" ? "Program Studi" :
                    tab === "rooms" ? "Ruangan" : 
                    tab === "lecturers" ? "Dosen" : 
                    tab === "courses" ? "Mata Kuliah" : "Rombel Kelas"
                  }
                </span>
              </h3>
              <button
                onClick={() => { setIsModalOpen(false); setEditingItem(null); }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              {/* PERIODE SEMESTER FORM */}
              {tab === "periods" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tahun Ajaran *</label>
                      <input
                        name="tahun_ajaran"
                        defaultValue={editingItem?.tahun_ajaran || "2026/2027"}
                        required
                        placeholder="Contoh: 2026/2027"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Jenis Semester *</label>
                      <select
                        name="semester"
                        defaultValue={editingItem?.semester || "GASAL"}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="GASAL">Gasal (Ganjil)</option>
                        <option value="GENAP">Genap</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kode Periode (Opsional)</label>
                    <input
                      name="kode"
                      defaultValue={editingItem?.kode || ""}
                      placeholder="Dikosongkan untuk otomatis (misal: 2026/2027-GASAL)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Jika dikosongkan, kode akan dibuat otomatis dari tahun ajaran &amp; semester.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai Kuliah</label>
                      <input
                        type="date"
                        name="tanggal_mulai"
                        defaultValue={editingItem?.tanggal_mulai || ""}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tanggal Selesai Kuliah</label>
                      <input
                        type="date"
                        name="tanggal_selesai"
                        defaultValue={editingItem?.tanggal_selesai || ""}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status Operasional *</label>
                    <select
                      name="status"
                      defaultValue={editingItem?.status || "DRAFT"}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DRAFT">Draft (Persiapan)</option>
                      <option value="ACTIVE">Aktif (Sedang Berjalan)</option>
                      <option value="ARCHIVED">Diarsipkan (Lampau)</option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Catatan: Mengubah status menjadi &quot;Aktif&quot; otomatis akan mengarsipkan semester aktif sebelumnya.
                    </p>
                  </div>
                </>
              )}

              {/* PROGRAM STUDI FORM */}
              {tab === "prodis" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kode Prodi (Prefix) *</label>
                      <input
                        name="kode"
                        defaultValue={editingItem?.kode || ""}
                        required
                        placeholder="Contoh: STA / STF / STP"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Jenjang Pendidikan *</label>
                      <select
                        name="jenjang"
                        defaultValue={editingItem?.jenjang || "S1"}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="S1">Strata 1 (S1)</option>
                        <option value="D3">Diploma 3 (D3)</option>
                        <option value="D4">Diploma 4 (D4)</option>
                        <option value="S2">Magister (S2)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Program Studi *</label>
                    <input
                      name="nama"
                      defaultValue={editingItem?.nama || ""}
                      required
                      placeholder="Contoh: Agroteknologi / Informatika / Peternakan"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Fakultas Naungan *</label>
                    <select
                      name="fakultas_id"
                      defaultValue={editingItem?.fakultas_id || faculties[0]?.id || ""}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      {faculties.map(f => (
                        <option key={f.id} value={f.id}>{f.kode} - {f.nama}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* RUANGAN FORM */}
              {tab === "rooms" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kode Ruang *</label>
                      <input
                        name="kode"
                        defaultValue={editingItem?.kode || ""}
                        required
                        placeholder="Contoh: 205 / 303 / LAB.Komputer"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Jenis Ruangan *</label>
                      <select
                        name="jenis"
                        defaultValue={editingItem?.jenis || "KELAS"}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="KELAS">Ruang Kelas Teori</option>
                        <option value="LABORATORIUM">Laboratorium Komputer/Sains</option>
                        <option value="GAZEBO">Gazebo / Outdoor</option>
                        <option value="AULA">Aula Utama</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Ruangan *</label>
                    <input
                      name="nama"
                      defaultValue={editingItem?.nama || ""}
                      required
                      placeholder="Contoh: Ruang Kuliah 205"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Gedung</label>
                      <input
                        name="gedung"
                        defaultValue={editingItem?.gedung || ""}
                        placeholder="Contoh: Gedung A"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Lantai</label>
                      <input
                        type="number"
                        name="lantai"
                        defaultValue={editingItem?.lantai || 1}
                        min={1}
                        max={10}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kapasitas (Kursi)</label>
                      <input
                        type="number"
                        name="kapasitas"
                        defaultValue={editingItem?.kapasitas || 40}
                        min={5}
                        max={500}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* DOSEN FORM */}
              {tab === "lecturers" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">NIDN</label>
                      <input
                        name="nidn"
                        defaultValue={editingItem?.nidn || ""}
                        placeholder="Nomor Induk Dosen Nasional"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Program Studi</label>
                      <select
                        name="prodi_id"
                        defaultValue={editingItem?.prodi_id || ""}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Pilih Program Studi</option>
                        {prodis.map(p => (
                          <option key={p.id} value={p.id}>{p.jenjang} {p.nama} ({p.kode})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap (Tanpa Gelar) *</label>
                    <input
                      name="nama"
                      defaultValue={editingItem?.nama || ""}
                      required
                      placeholder="Contoh: Rudi Santoso"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Gelar Depan</label>
                      <input
                        name="gelar_depan"
                        defaultValue={editingItem?.gelar_depan || ""}
                        placeholder="Contoh: Dr. / Prof."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Gelar Belakang</label>
                      <input
                        name="gelar_belakang"
                        defaultValue={editingItem?.gelar_belakang || ""}
                        placeholder="Contoh: M.Kom. / Ph.D."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Akademik</label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={editingItem?.email || ""}
                      placeholder="dosen@unu.ac.id"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* MATA KULIAH FORM */}
              {tab === "courses" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kode MK *</label>
                      <input
                        name="kode"
                        defaultValue={editingItem?.kode || ""}
                        required
                        placeholder="Contoh: STA1101B / STF1101A"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tipe Mata Kuliah *</label>
                      <select
                        name="jenis"
                        defaultValue={editingItem?.jenis || "TEORI"}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="TEORI">Teori</option>
                        <option value="PRAKTIK">Praktikum Laboratorium</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Mata Kuliah *</label>
                    <input
                      name="nama"
                      defaultValue={editingItem?.nama || ""}
                      required
                      placeholder="Contoh: Algoritma & Struktur Data"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Program Studi *</label>
                    <select
                      name="prodi_id"
                      defaultValue={editingItem?.prodi_id || prodis[0]?.id || ""}
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      {prodis.map(p => (
                        <option key={p.id} value={p.id}>{p.jenjang} {p.nama} ({p.kode})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Total SKS</label>
                      <input
                        type="number"
                        name="sks"
                        defaultValue={editingItem?.sks || 3}
                        min={1}
                        max={6}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">SKS Teori</label>
                      <input
                        type="number"
                        name="teori_sks"
                        defaultValue={editingItem?.teori_sks || 2}
                        min={0}
                        max={6}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">SKS Praktik</label>
                      <input
                        type="number"
                        name="praktik_sks"
                        defaultValue={editingItem?.praktik_sks || 0}
                        min={0}
                        max={6}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* KELAS ROMBEL FORM */}
              {tab === "classes" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kode Rombel *</label>
                      <input
                        name="kode_kelas"
                        defaultValue={editingItem?.kode_kelas || ""}
                        required
                        placeholder="Contoh: IF1A-2026 / STA-1A"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nama Rombel / Kelas *</label>
                      <input
                        name="nama_kelas"
                        defaultValue={editingItem?.nama_kelas || ""}
                        required
                        placeholder="Contoh: Struktur Data - Kelas 1A"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Mata Kuliah *</label>
                      <select
                        name="mata_kuliah_id"
                        defaultValue={editingItem?.mata_kuliah_id || courses[0]?.id || ""}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.kode} - {c.nama} ({c.sks} SKS)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Program Studi *</label>
                      <select
                        name="prodi_id"
                        defaultValue={editingItem?.prodi_id || prodis[0]?.id || ""}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        {prodis.map(p => (
                          <option key={p.id} value={p.id}>{p.jenjang} {p.nama} ({p.kode})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dosen Pengampu (Utama)</label>
                    <select
                      name="dosen_id"
                      defaultValue={editingItem?.pengampu_list?.[0]?.dosen?.id || ""}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Pilih Dosen Pengampu</option>
                      {lecturers.map(l => (
                        <option key={l.id} value={l.id}>{l.nama_lengkap} ({l.nidn || "No NIDN"})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Semester Periode *</label>
                      <select
                        name="semester_periode_id"
                        defaultValue={editingItem?.semester_periode_id || periods[0]?.id || ""}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        {periods.map(p => (
                          <option key={p.id} value={p.id}>{p.kode} ({p.tahun_ajaran})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Bobot SKS</label>
                      <input
                        type="number"
                        name="sks"
                        defaultValue={editingItem?.sks || 3}
                        min={1}
                        max={6}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Jml Mahasiswa</label>
                      <input
                        type="number"
                        name="jumlah_mahasiswa"
                        defaultValue={editingItem?.jumlah_mahasiswa || 30}
                        min={1}
                        max={100}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingItem(null); }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? "Simpan Perubahan" : "Simpan Data"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION: SOFT DELETE */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-3 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Konfirmasi Soft Delete</h3>
                <p className="text-xs text-slate-500">Nonaktifkan data tanpa menghapus permanen.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Apakah Anda yakin ingin menonaktifkan data <span className="font-bold text-slate-900">&quot;{deleteTarget.name}&quot;</span>?
              <br /><br />
              <span className="text-slate-500">
                💡 Data ini tidak akan dihapus dari basis data dan dapat dipulihkan kapan saja melalui filter status &quot;Nonaktif&quot;.
              </span>
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmSoftDelete}
                disabled={submitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-xs transition-colors flex items-center gap-1.5 text-xs"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Nonaktifkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CETAK BARCODE / QR CODE (PINTU KELAS, KELAS & DOSEN) */}
      {qrModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Barcode / QR Code Resmi</span>
              </span>
              <button
                onClick={() => setQrModalData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Card Area */}
            <div id="printable-qr-card" className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-[10px] font-bold text-blue-900 tracking-wider uppercase">
                UNIVERSITAS NAHDLATUL ULAMA
              </div>

              {/* QR Image rendered locally via QRCode */}
              <div className="flex justify-center py-2">
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm inline-block">
                  <img
                    src={qrModalData.dataUrl}
                    alt={`QR Code ${qrModalData.title}`}
                    width={200}
                    height={200}
                    className="mx-auto block"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-black text-slate-900 text-base leading-tight">
                  {qrModalData.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {qrModalData.subtitle}
                </p>
                <div className="inline-block mt-1 font-mono text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                  {qrModalData.code}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                Pindai QR ini dengan kamera ponsel untuk melihat jadwal perkuliahan hari ini & sepekan tanpa perlu login.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <a
                href={qrModalData.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Tautan</span>
              </a>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar QR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LECTURER AVAILABILITY / BUSY HOURS MODAL */}
      {availModalLecturer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">
                    Atur Waktu Mengajar &amp; Jam Sibuk Dosen
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-bold text-slate-800">{availModalLecturer.nama_lengkap}</span>
                    {availModalLecturer.nidn ? ` (NIDN: ${availModalLecturer.nidn})` : ""} • Batasan Mutlak bagi Mesin GA
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAvailModalLecturer(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction & Legend */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-semibold text-slate-700">Keterangan:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 border border-emerald-600"></span>
                  <span className="text-slate-600 font-medium">Bisa Mengajar (Tersedia)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-rose-500 border border-rose-600"></span>
                  <span className="text-rose-700 font-bold">Jam Sibuk / Tidak Bersedia (Dilarang GA)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetAllAvailable}
                  className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-bold text-[11px] shadow-xs transition-colors"
                >
                  Set Semua Bersedia
                </button>
              </div>
            </div>

            {/* Interactive Grid Table */}
            {loadingAvail ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                <span className="text-xs font-medium">Memuat jadwal waktu mengajar...</span>
              </div>
            ) : (
              <div className="overflow-auto border border-slate-200 rounded-2xl flex-1 max-h-[50vh]">
                <table className="w-full text-center text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 z-10 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3 bg-slate-100 border-r border-slate-200 text-left min-w-[140px]">
                        Slot Jam Perkuliahan
                      </th>
                      {days.map(d => (
                        <th key={d.id} className="p-3 border-r border-slate-200 min-w-[100px]">
                          {d.nama}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {timeSlots.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-medium text-left border-r border-slate-200 bg-slate-50/50">
                          <div className="font-bold text-slate-800">Slot {s.nomor}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {s.jam_mulai.slice(0, 5)} - {s.jam_selesai.slice(0, 5)}
                          </div>
                        </td>
                        {days.map(d => {
                          const key = `${d.id}_${s.id}`;
                          const isBusy = unavailableSlotKeys.has(key);
                          return (
                            <td key={d.id} className="p-1.5 border-r border-slate-200 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSlotAvailability(d.id, s.id)}
                                className={`w-full py-2 px-2 rounded-xl text-[11px] font-bold transition-all active:scale-95 shadow-xs flex items-center justify-center gap-1 ${
                                  isBusy
                                    ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20"
                                    : "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                                }`}
                                title={isBusy ? "Dosen TIDAK BISA di jam ini (Klik untuk ubah jadi Bersedia)" : "Dosen BISA mengajar (Klik untuk tandai Jam Sibuk)"}
                              >
                                {isBusy ? (
                                  <>
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>Sibuk</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Bisa</span>
                                  </>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Total slot jam sibuk (dilarang GA):{" "}
                <span className="font-bold text-rose-600">{unavailableSlotKeys.size} slot</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAvailModalLecturer(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={savingAvail}
                  onClick={handleSaveAvailability}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {savingAvail ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Ketersediaan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
