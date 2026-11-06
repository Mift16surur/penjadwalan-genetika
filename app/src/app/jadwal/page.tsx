"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  Calendar, Clock, Building2, User, BookOpen, Layers, 
  Search, RefreshCw, QrCode, Filter, Printer, ExternalLink,
  GraduationCap, Sparkles
} from "lucide-react";
import { fetchPublicActiveSchedule, fetchDepartments, fetchRooms } from "@/lib/api";
import { Prodi, Ruangan } from "@/lib/types";

export default function PublicSchedulePage() {
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [versiInfo, setVersiInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [prodis, setProdis] = useState<Prodi[]>([]);
  const [rooms, setRooms] = useState<Ruangan[]>([]);
  const [selectedProdi, setSelectedProdi] = useState<string>("");
  const [selectedHari, setSelectedHari] = useState<number | "">("");
  const [selectedRuang, setSelectedRuang] = useState<string>("");
  const [search, setSearch] = useState("");

  // QR Demo modal
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    async function initMeta() {
      try {
        const [pList, rList] = await Promise.all([
          fetchDepartments({ status: "active" }),
          fetchRooms({ status: "active" })
        ]);
        setProdis(pList);
        setRooms(rList);
      } catch (err) {
        console.error("Meta error", err);
      }
    }
    initMeta();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetchPublicActiveSchedule({
        prodiId: selectedProdi || undefined,
        hariId: selectedHari !== "" ? Number(selectedHari) : undefined,
        ruanganId: selectedRuang || undefined
      });
      if (res && res.status === "success") {
        setScheduleData(res.data || []);
        setVersiInfo(res.versi);
      } else {
        setScheduleData([]);
        setVersiInfo(null);
      }
    } catch (err) {
      console.error("Schedule error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [selectedProdi, selectedHari, selectedRuang]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return scheduleData;
    const q = search.toLowerCase();
    return scheduleData.filter((item) => {
      const mkNama = item.kelas?.mata_kuliah?.toLowerCase() || "";
      const mkKode = item.kelas?.kode_mk?.toLowerCase() || "";
      const klsKode = item.kelas?.kode_kelas?.toLowerCase() || "";
      const ruangKode = item.ruangan?.kode?.toLowerCase() || "";
      const ruangNama = item.ruangan?.nama?.toLowerCase() || "";
      const dosenStr = item.kelas?.dosen_pengampu?.map((d: any) => d.nama.toLowerCase()).join(" ") || "";

      return (
        mkNama.includes(q) ||
        mkKode.includes(q) ||
        klsKode.includes(q) ||
        ruangKode.includes(q) ||
        ruangNama.includes(q) ||
        dosenStr.includes(q)
      );
    });
  }, [scheduleData, search]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Portal Jadwal Kuliah Resmi UNU</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Jadwal Perkuliahan Mahasiswa & Dosen
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed">
            Akses langsung jadwal tanpa perlu login. Scan Barcode / QR Code di pintu ruang kelas atau gunakan filter di bawah untuk melihat jadwal perkuliahan Anda.
          </p>
          {versiInfo && (
            <div className="pt-2 flex items-center gap-2 text-xs text-blue-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Versi Aktif: <strong>{versiInfo.nama}</strong></span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-bold backdrop-blur-xs border border-white/20 transition-all shadow-xs"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Simulasi Scan QR Pintu Kelas</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-950 hover:bg-slate-100 active:scale-95 rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Jadwal</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Day Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
          <span className="text-slate-400 px-2 flex items-center gap-1 text-[11px] uppercase tracking-wider shrink-0">
            <Calendar className="w-3.5 h-3.5" /> Hari:
          </span>
          {[
            { id: "", label: "Semua Hari" },
            { id: 1, label: "Senin" },
            { id: 2, label: "Selasa" },
            { id: 3, label: "Rabu" },
            { id: 4, label: "Kamis" },
            { id: 5, label: "Jumat" },
            { id: 6, label: "Sabtu" }
          ].map((d) => (
            <button
              key={d.label}
              onClick={() => setSelectedHari(d.id as any)}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                selectedHari === d.id
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Dropdown Filters & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Prodi Filter */}
          <select
            value={selectedProdi}
            onChange={(e) => setSelectedProdi(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Program Studi</option>
            {prodis.map(p => (
              <option key={p.id} value={p.id}>{p.jenjang} {p.nama} ({p.kode})</option>
            ))}
          </select>

          {/* Room Filter */}
          <select
            value={selectedRuang}
            onChange={(e) => setSelectedRuang(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Ruangan Kuliah</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.kode} - {r.nama}</option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari mata kuliah, dosen, ruang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* Main Schedule Grid / List */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex justify-center items-center gap-2 text-slate-400 shadow-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm font-semibold">Memuat jadwal kuliah terbaru...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3 shadow-xs">
          <div className="inline-flex p-4 bg-slate-100 rounded-full text-slate-400">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Tidak ada jadwal ditemukan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Coba sesuaikan filter hari, program studi, atau kata kunci pencarian Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const dosenNames = item.kelas?.dosen_pengampu?.map((d: any) => d.nama).join(" & ") || "Dosen Pengampu";
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all hover:border-blue-300 flex flex-col justify-between space-y-4 group"
              >
                {/* Top: Day and Time Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold text-xs border border-blue-200/60">
                    <Calendar className="w-3 h-3" />
                    <span>{item.hari?.nama || "Hari"}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{item.jam_mulai} - {item.jam_selesai}</span>
                  </span>
                </div>

                {/* Course Name & Class Code */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-700 transition-colors leading-snug">
                      {item.kelas?.mata_kuliah}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {item.kelas?.kode_kelas}
                    </span>
                    <span>•</span>
                    <span className="text-blue-700 font-bold">
                      {item.kelas?.sks} SKS
                    </span>
                  </div>
                </div>

                {/* Room and Lecturer Details */}
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  {/* Room */}
                  <Link
                    href={`/jadwal/ruang/${encodeURIComponent(item.ruangan?.kode || "")}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200/80 transition-colors group/room"
                  >
                    <div className="flex items-center gap-2 text-slate-700 group-hover/room:text-blue-800 font-medium">
                      <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-bold">{item.ruangan?.nama}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({item.ruangan?.gedung || "Kampus"})
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover/room:text-blue-600 shrink-0" />
                  </Link>

                  {/* Lecturer */}
                  <div className="flex items-center gap-2 text-slate-600 px-1">
                    <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate font-medium text-[11px]">{dosenNames}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL SIMULASI SCAN QR PINTU RUANG KELAS */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Simulasi Hasil Scan QR Code</h3>
                  <p className="text-[11px] text-slate-500">Pilih salah satu ruangan untuk melihat tampilan scan pintu kelas</p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1"
              >
                Tutup
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200">
              💡 <strong>Cara Kerja:</strong> Setiap pintu ruang kelas akan ditempel stiker Barcode/QR Code. Saat mahasiswa atau dosen memindai stiker tersebut menggunakan kamera smartphone, layar langsung membuka halaman jadwal khusus ruangan tersebut tanpa perlu login.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <label className="block text-xs font-bold text-slate-700">Pilih Ruangan untuk Diuji:</label>
              {rooms.map(r => (
                <Link
                  key={r.id}
                  href={`/jadwal/ruang/${encodeURIComponent(r.kode)}`}
                  onClick={() => setShowQrModal(false)}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-xs font-medium"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                      {r.kode}
                    </span>
                    <span className="font-semibold text-slate-800">{r.nama}</span>
                    <span className="text-slate-400">({r.gedung || "Gedung Utama"})</span>
                  </div>
                  <span className="text-blue-600 font-bold flex items-center gap-1">
                    <span>Buka Tampilan</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

