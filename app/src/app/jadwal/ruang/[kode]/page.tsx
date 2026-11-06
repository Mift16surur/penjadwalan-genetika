"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Building2, Calendar, Clock, User, ArrowLeft, 
  QrCode, Printer, CheckCircle2, AlertTriangle, RefreshCw 
} from "lucide-react";
import { fetchPublicRoomSchedule } from "@/lib/api";

export default function RoomPublicSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const rawKode = params?.kode as string;
  const kodeRuang = decodeURIComponent(rawKode || "");

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!kodeRuang) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetchPublicRoomSchedule(kodeRuang);
        setData(res);
      } catch (err: any) {
        setErrorMsg(err.message || "Gagal memuat jadwal ruangan.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [kodeRuang]);

  // Group by Hari
  const groupedByDay = (data?.data || []).reduce((acc: any, item: any) => {
    const hari = item.hari || "Hari";
    if (!acc[hari]) acc[hari] = [];
    acc[hari].push(item);
    return acc;
  }, {});

  const handlePrint = () => {
    window.print();
  };

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
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak Lembar Pintu</span>
        </button>
      </div>

      {/* Hero Badge Pintu Kelas */}
      <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
            <QrCode className="w-3.5 h-3.5" />
            <span>Hasil Pindai Barcode / QR Pintu Kelas</span>
          </div>

          <span className="text-xs font-mono text-blue-200 bg-white/10 px-3 py-1 rounded-full">
            Kode: {kodeRuang}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Building2 className="w-8 h-8 text-blue-300 shrink-0" />
            <span>{data?.ruangan?.nama || `Ruang ${kodeRuang}`}</span>
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/80 mt-1">
            {data?.ruangan?.gedung || "Gedung Perkuliahan"} • Lantai {data?.ruangan?.lantai || 1} • Kapasitas {data?.ruangan?.kapasitas || 40} Kursi • Tipe: <strong className="uppercase">{data?.ruangan?.jenis || "KELAS"}</strong>
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex justify-center items-center gap-2 text-slate-400 shadow-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-xs font-bold">Memuat agenda ruangan...</span>
        </div>
      ) : errorMsg ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-2 text-rose-800">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-bold text-sm">Gagal Menampilkan Jadwal</h3>
          <p className="text-xs text-rose-600">{errorMsg}</p>
        </div>
      ) : Object.keys(groupedByDay).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2 shadow-xs">
          <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">Ruangan Kosong</h3>
          <p className="text-xs text-slate-500">Tidak ada jadwal perkuliahan yang terjadwal di ruangan ini pada periode aktif.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDay).map(([hari, items]: [string, any]) => (
            <div key={hari} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Hari {hari}</span>
                </span>
                <span className="text-xs font-bold text-slate-500 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                  {items.length} Sesi Perkuliahan
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {items.map((sesi: any, idx: number) => (
                  <div key={idx} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                    {/* Time */}
                    <div className="flex items-center gap-2 font-mono font-bold text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{sesi.jam_mulai} - {sesi.jam_selesai}</span>
                    </div>

                    {/* Course & Class */}
                    <div className="space-y-1 flex-1">
                      <h4 className="font-bold text-sm text-slate-900">
                        {sesi.nama_mk}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {sesi.kode_kelas}
                        </span>
                        <span>•</span>
                        <span>{sesi.sks} SKS</span>
                        <span>•</span>
                        <span>{sesi.jumlah_mahasiswa} Mahasiswa</span>
                      </div>
                    </div>

                    {/* Lecturer */}
                    <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 sm:max-w-xs truncate">
                      <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{sesi.dosen}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

