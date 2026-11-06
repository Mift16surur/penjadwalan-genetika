"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Calendar, Cpu, UploadCloud, Database, Settings2, 
  CheckCircle2, ArrowRight, BookOpen, Users, Building2,
  FileSpreadsheet, QrCode, ShieldCheck
} from "lucide-react";
import { 
  fetchRooms, fetchLecturers, fetchClasses, fetchScheduleVersions,
  getExcelTemplateUrl
} from "@/lib/api";
import { VersiJadwal } from "@/lib/types";

export default function Home() {
  const [stats, setStats] = useState({
    rooms: 0,
    lecturers: 0,
    classes: 0,
    versions: [] as VersiJadwal[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [r, l, c, v] = await Promise.all([
          fetchRooms(),
          fetchLecturers(),
          fetchClasses(),
          fetchScheduleVersions()
        ]);
        setStats({
          rooms: r.length,
          lecturers: l.length,
          classes: c.length,
          versions: v
        });
      } catch (err) {
        console.error("Gagal memuat data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const bestVersion = stats.versions[0];

  return (
    <div className="space-y-8">
      {/* Banner Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-8 sm:p-10 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md text-blue-200 border border-white/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sistem Otomasi Penjadwalan Universitas Nahdlatul Ulama</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Penjadwalan Kuliah Cerdas Berbasis Algoritma Genetika
          </h1>
          <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed">
            Optimasi penempatan jadwal perkuliahan otomatis multi-fakultas (FST, FSEH, FAI), multi-dosen tim teaching, dan alokasi laboratorium praktikum tanpa bentrok.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/jadwal"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <QrCode className="w-4 h-4 text-emerald-200" />
              <span>Portal Jadwal & Scan Barcode</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/matrix"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-sm shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>Buka Matriks Jadwal</span>
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 font-semibold text-sm transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-blue-300" />
              <span>Login Petugas BAAK</span>
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{loading ? "..." : stats.rooms}</div>
            <div className="text-xs text-slate-500 font-medium">Ruang Perkuliahan</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{loading ? "..." : stats.lecturers}</div>
            <div className="text-xs text-slate-500 font-medium">Dosen Pengampu</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{loading ? "..." : stats.classes}</div>
            <div className="text-xs text-slate-500 font-medium">Rombel Kelas</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{loading ? "..." : stats.versions.length}</div>
            <div className="text-xs text-slate-500 font-medium">Kandidat Jadwal</div>
          </div>
        </div>
      </div>

      {/* Featured Grid Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Matrix View */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Matriks Visualisasi Jadwal</h3>
            <p className="text-sm text-slate-600">
              Tampilkan jadwal kuliah dalam format grid 2D interaktif berdasarkan Ruangan, Dosen, atau Rombel Kelas. Dilengkapi fitur geser jadwal manual dengan deteksi bentrok seketika.
            </p>
          </div>
          <div className="pt-5">
            <Link
              href="/matrix"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
            >
              <span>Lihat Matriks</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Card 2: GA Control Room */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Kontrol Mesin GA</h3>
            <p className="text-sm text-slate-600">
              Jalankan optimasi algoritma genetika dengan mengatur ukuran populasi, jumlah generasi, tingkat mutasi, dan pantau grafik fitness secara real-time.
            </p>
          </div>
          <div className="pt-5">
            <Link
              href="/generator"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5"
            >
              <span>Buka Kontrol GA</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Card 3: Excel IO */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Impor & Ekspor Excel</h3>
            <p className="text-sm text-slate-600">
              Unduh template format Excel resmi 5 sheet, unggah file data perkuliahan, atau unduh jadwal final versi terbaik dalam bentuk spreadsheet siap cetak.
            </p>
          </div>
          <div className="pt-5">
            <Link
              href="/import"
              className="text-sm font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1.5"
            >
              <span>Kelola File Excel</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Latest Schedule Candidate Status */}
      {bestVersion && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-lg">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span>Kandidat Terbaik Saat Ini</span>
            </div>
            <h2 className="text-2xl font-bold">{bestVersion.nama}</h2>
            <p className="text-slate-400 text-sm">
              Fitness Score: <span className="font-semibold text-white">{bestVersion.fitness_score.toFixed(4)}</span> | 
              Total Pelanggaran: <span className={`font-semibold ${bestVersion.jumlah_pelanggaran === 0 ? "text-emerald-400" : "text-amber-400"}`}>{bestVersion.jumlah_pelanggaran}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/matrix"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl transition-all"
            >
              Lihat di Matriks
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
