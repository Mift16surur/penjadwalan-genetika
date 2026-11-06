"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  User, Calendar, Clock, Building2, ArrowLeft, 
  QrCode, Printer, CheckCircle2, AlertTriangle, RefreshCw, Mail,
  CalendarSync, X, Check, Send, Sparkles, ShieldCheck
} from "lucide-react";
import { 
  fetchPublicLecturerSchedule, 
  fetchAvailableRescheduleSlots, 
  submitRescheduleRequest 
} from "@/lib/api";
import { AvailableSlotItem } from "@/lib/types";

export default function LecturerPublicSchedulePage() {
  const params = useParams();
  const lecturerId = params?.id as string;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reschedule Request Modal State
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [nidnInput, setNidnInput] = useState("");
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [reasonInput, setReasonInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      if (!lecturerId) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetchPublicLecturerSchedule(lecturerId);
        setData(res);
      } catch (err: any) {
        setErrorMsg(err.message || "Gagal memuat jadwal mengajar dosen.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lecturerId]);

  // Open Reschedule Modal
  const handleOpenReschedule = async (sesi: any) => {
    setSelectedSession(sesi);
    setSelectedSlotIndex(null);
    setReasonInput("");
    setRequestFeedback(null);
    setNidnInput(data?.dosen?.nidn || "");
    setLoadingSlots(true);

    try {
      const slots = await fetchAvailableRescheduleSlots(sesi.jadwal_id, lecturerId);
      setAvailableSlots(slots);
      if (slots.length > 0) {
        setSelectedSlotIndex(0);
      }
    } catch (err: any) {
      setRequestFeedback({ type: "error", text: err.message || "Gagal mencari slot kosong." });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || selectedSlotIndex === null) return;
    const targetSlot = availableSlots[selectedSlotIndex];
    if (!targetSlot) return;

    setSubmitting(true);
    setRequestFeedback(null);

    try {
      const payload = {
        jadwal_id: selectedSession.jadwal_id,
        dosen_id: lecturerId,
        nidn_verification: nidnInput.trim(),
        ruangan_tujuan_id: targetSlot.ruangan_id,
        hari_tujuan_id: targetSlot.hari_id,
        slot_tujuan_id: targetSlot.slot_id,
        alasan: reasonInput.trim()
      };

      const res = await submitRescheduleRequest(payload);
      setRequestFeedback({
        type: "success",
        text: "Permohonan ganti jadwal berhasil dikirim! Menunggu persetujuan Petugas BAAK."
      });
      setTimeout(() => {
        setSelectedSession(null);
      }, 2500);
    } catch (err: any) {
      setRequestFeedback({
        type: "error",
        text: err.message || "Gagal mengajukan ganti jadwal."
      });
    } finally {
      setSubmitting(false);
    }
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
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak Jadwal Mengajar</span>
        </button>
      </div>

      {/* Hero Badge Dosen */}
      <div className="bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
            <QrCode className="w-3.5 h-3.5" />
            <span>Hasil Pindai Barcode / QR Dosen Pengampu</span>
          </div>

          {data?.dosen?.nidn && (
            <span className="text-xs font-mono text-emerald-200 bg-white/10 px-3 py-1 rounded-full">
              NIDN: {data.dosen.nidn}
            </span>
          )}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <User className="w-8 h-8 text-emerald-300 shrink-0" />
            <span>{data?.dosen?.nama_lengkap || "Dosen Pengampu"}</span>
          </h1>
          {data?.dosen?.email && (
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{data.dosen.email}</span>
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex justify-center items-center gap-2 text-slate-400 shadow-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span className="text-xs font-bold">Memuat jadwal mengajar...</span>
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
          <h3 className="font-bold text-slate-800 text-sm">Tidak Ada Jadwal Mengajar</h3>
          <p className="text-xs text-slate-500">Dosen ini belum memiliki alokasi waktu mengajar pada versi jadwal aktif.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              Agenda Mengajar Mingguan
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {data?.data?.length} Kelas Diampu
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {data.data.map((sesi: any, idx: number) => (
              <div key={idx} className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-2 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-xs text-center min-w-[70px]">
                    <div>{sesi.hari}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sesi.jam_mulai} - {sesi.jam_selesai}</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mt-0.5">
                      {sesi.mata_kuliah}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {sesi.kode_kelas}
                      </span>
                      <span>•</span>
                      <span>{sesi.sks} SKS</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Ruang: {sesi.ruangan}</span>
                  </div>

                  {/* Tombol Ajukan Ganti Jadwal */}
                  <button
                    onClick={() => handleOpenReschedule(sesi)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs shadow-xs transition-all active:scale-95 shrink-0"
                  >
                    <CalendarSync className="w-3.5 h-3.5 text-amber-700" />
                    <span>Ajukan Ganti Jadwal</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL PENGAJUAN GANTI JADWAL (TANPA LOGIN, VERIFIKASI NIDN) */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-200">
                  <CalendarSync className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Permohonan Ganti Jadwal Kuliah</h3>
                  <p className="text-[11px] text-slate-500">Pilih slot jadwal yang kosong tanpa bentrok</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Feedback */}
            {requestFeedback && (
              <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                requestFeedback.type === "success" 
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                  : "bg-rose-50 text-rose-900 border-rose-300"
              }`}>
                {requestFeedback.type === "success" ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                <span>{requestFeedback.text}</span>
              </div>
            )}

            {/* Summary Asal */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Sesi Kuliah yang Ingin Digeser:
              </div>
              <div className="font-extrabold text-slate-900 text-sm">
                {selectedSession.mata_kuliah} ({selectedSession.kode_kelas})
              </div>
              <div className="text-slate-600 flex items-center gap-2">
                <span>Jadwal Saat Ini: <strong>{selectedSession.hari}, {selectedSession.jam_mulai} - {selectedSession.jam_selesai}</strong></span>
                <span>•</span>
                <span>Ruang: <strong>{selectedSession.ruangan}</strong></span>
              </div>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              {/* Field 1: Verifikasi NIDN */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Verifikasi NIDN Dosen Pengampu *</span>
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">Verifikasi instan tanpa login</span>
                </label>
                <input
                  type="text"
                  required
                  value={nidnInput}
                  onChange={(e) => setNidnInput(e.target.value)}
                  placeholder="Masukkan NIDN Anda (contoh: 062809...)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Field 2: Pilihan Waktu & Ruangan Baru (Anti Bentrok) */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pilih Waktu & Ruangan Baru (100% Bebas Bentrok) *</span>
                  </span>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {availableSlots.length} Pilihan Kosong
                  </span>
                </label>

                {loadingSlots ? (
                  <div className="p-8 border border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Menganalisis jadwal dan mencari ruangan kosong...</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs">
                    Tidak ditemukan slot waktu & ruangan kosong yang memenuhi kriteria kelas ini. Silakan hubungi BAAK langsung.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {availableSlots.map((slot, sIdx) => {
                      const isSelected = selectedSlotIndex === sIdx;
                      return (
                        <div
                          key={sIdx}
                          onClick={() => setSelectedSlotIndex(sIdx)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? "bg-blue-50/80 border-blue-500 shadow-xs"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="slotSelection"
                              checked={isSelected}
                              onChange={() => setSelectedSlotIndex(sIdx)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <div>
                              <div className="font-bold text-slate-900">
                                {slot.hari_nama}, {slot.jam_mulai} - {slot.jam_selesai}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                Ruang: <strong>{slot.ruangan_nama} ({slot.ruangan_kode})</strong> • {slot.kapasitas} Kursi • {slot.ruangan_gedung || "Gedung Utama"}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Aman
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Field 3: Alasan Pergantian */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  Alasan Permohonan Pergantian *
                </label>
                <textarea
                  required
                  rows={2}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Contoh: Tugas dinas luar kota / Menghadiri seminar / Kesepakatan bersama mahasiswa rombel..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || availableSlots.length === 0 || selectedSlotIndex === null}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 active:scale-95"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Kirim Permohonan ke BAAK</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
