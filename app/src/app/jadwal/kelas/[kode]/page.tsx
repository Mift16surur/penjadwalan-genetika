"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  Layers, Calendar, Clock, Building2, User, ArrowLeft, 
  QrCode, Printer, CheckCircle2, AlertTriangle, RefreshCw 
} from "lucide-react";
import { fetchPublicClassSchedule } from "@/lib/api";

export default function ClassPublicSchedulePage() {
  const params = useParams();
  const rawKode = params?.kode as string;
  const kodeKelas = decodeURIComponent(rawKode || "");

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!kodeKelas) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetchPublicClassSchedule(kodeKelas);
        setData(res);
      } catch (err: any) {
        setErrorMsg(err.message || "Gagal memuat jadwal rombel kelas.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [kodeKelas]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/jadwal"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Portal Jadwal</span>
        </Link>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak Jadwal Rombel</span>
        </button>
      </div>

      {/* Hero Badge Mahasiswa */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
            <QrCode className="w-3.5 h-3.5" />
            <span>Hasil Pindai Barcode / QR Rombel Mahasiswa</span>
          </div>

          <span className="text-xs font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-full font-bold">
            {kodeKelas}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Layers className="w-8 h-8 text-indigo-300 shrink-0" />
            <span>{data?.kelas?.nama_kelas || `Kelas ${kodeKelas}`}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Mata Kuliah: <strong>{data?.kelas?.mata_kuliah}</strong> • Beban: <strong>{data?.kelas?.sks || 0} SKS</strong> • Total Peserta: {data?.kelas?.jumlah_mahasiswa || 0} Mahasiswa
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex justify-center items-center gap-2 text-slate-400 shadow-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-xs font-bold">Memuat jadwal rombel...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-2 text-rose-800">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-bold text-sm">Gagal Menampilkan Jadwal</h3>
          <p className="text-xs text-rose-600">{errorMsg}</p>
        </div>
      ) : (data?.data || []).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2 shadow-xs">
          <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">Belum Ada Sesi Terjadwal</h3>
          <p className="text-xs text-slate-500">Rombel ini belum memiliki alokasi waktu pada versi jadwal aktif.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              Agenda Pertemuan Mingguan
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
              {data?.data?.length} Pertemuan
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {data.data.map((sesi: any, idx: number) => (
              <div key={idx} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-2 bg-blue-50 text-blue-800 rounded-xl font-bold text-xs text-center min-w-[70px]">
                    <div>{sesi.hari}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sesi.jam_mulai} - {sesi.jam_selesai}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{sesi.ruangan}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60">
                  <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Dosen: {sesi.dosen}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

