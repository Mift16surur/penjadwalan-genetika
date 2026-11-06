"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Building2, QrCode, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import { fetchRooms } from "@/lib/api";
import { Ruangan } from "@/lib/types";

interface RoomWithQr extends Ruangan {
  qrDataUrl: string;
  targetUrl: string;
}

export default function StikerRuangPage() {
  const [rooms, setRooms] = useState<RoomWithQr[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const rawRooms = await fetchRooms({ status: "active" });
        const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

        const withQr = await Promise.all(
          rawRooms.map(async (r) => {
            const targetUrl = `${origin}/jadwal/ruang/${encodeURIComponent(r.kode)}`;
            const qrDataUrl = await QRCode.toDataURL(targetUrl, {
              width: 280,
              margin: 1,
              color: { dark: "#0f172a", light: "#ffffff" }
            });
            return {
              ...r,
              targetUrl,
              qrDataUrl
            };
          })
        );
        setRooms(withQr);
      } catch (err) {
        console.error("Gagal generate QR rooms", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Bar (Hidden on Print) */}
      <div className="print:hidden bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/master"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Master Akademik</span>
          </Link>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-emerald-600" />
            <span>Lembar Cetak Stiker QR Pintu Ruang Kuliah</span>
          </h1>
          <p className="text-xs text-slate-500">
            Cetak stiker Barcode / QR Code ini pada kertas stiker / A4, lalu gunting sesuai garis dan tempel pada pintu ruang kelas UNU.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 text-xs transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Semua Stiker ({rooms.length} Ruangan)</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex justify-center items-center gap-2 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span className="text-sm font-semibold">Menghasilkan kode QR untuk seluruh ruangan...</span>
        </div>
      ) : (
        /* Printable Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 print:p-0">
          {rooms.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-6 flex flex-col items-center justify-between text-center space-y-4 shadow-xs print:shadow-none print:border-slate-400 print:break-inside-avoid"
            >
              {/* Header UNU */}
              <div className="space-y-0.5 border-b border-slate-100 pb-2 w-full">
                <div className="text-[11px] font-extrabold tracking-widest text-blue-900 uppercase">
                  UNIVERSITAS NAHDLATUL ULAMA
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  JADWAL PERKULIAHAN RESMI
                </div>
              </div>

              {/* Room Badge */}
              <div className="space-y-1">
                <div className="text-xs uppercase font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-full inline-block border border-blue-200">
                  {r.nama}
                </div>
                <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {r.kode}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {r.gedung || "Gedung Utama"} • Lantai {r.lantai} • Kapasitas {r.kapasitas} Kursi
                </div>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs inline-block">
                <img
                  src={r.qrDataUrl}
                  alt={`QR Code ${r.kode}`}
                  width={200}
                  height={200}
                  className="mx-auto block"
                />
              </div>

              {/* Scan Guide */}
              <div className="pt-2 border-t border-slate-100 w-full space-y-1">
                <p className="text-[11px] font-bold text-slate-800">
                  📲 Pindai untuk Jadwal Hari Ini
                </p>
                <p className="text-[9px] text-slate-400 leading-tight">
                  Gunakan kamera HP untuk melihat jadwal kuliah di ruangan ini tanpa login.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

