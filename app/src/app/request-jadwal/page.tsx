"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  CalendarSync, Clock, Building2, User, Check, X, 
  AlertTriangle, RefreshCw, ArrowRight, ShieldCheck, 
  Calendar, CheckCircle2, MessageSquare, Filter
} from "lucide-react";
import { fetchRescheduleRequests, reviewRescheduleRequest } from "@/lib/api";
import { PermohonanGantiJadwal } from "@/lib/types";

export default function RescheduleRequestsPage() {
  const [requests, setRequests] = useState<PermohonanGantiJadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Review Modal state (for Reject with reason or Approval note)
  const [activeReviewItem, setActiveReviewItem] = useState<{ req: PermohonanGantiJadwal; action: "APPROVED" | "REJECTED" } | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchRescheduleRequests(statusFilter);
      setRequests(data);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: "error", text: "Gagal memuat permohonan ganti jadwal." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const handleExecuteReview = async () => {
    if (!activeReviewItem) return;
    const { req, action } = activeReviewItem;

    setProcessingId(req.id);
    setFeedback(null);

    try {
      await reviewRescheduleRequest(req.id, {
        status: action,
        catatan_baak: adminNote.trim() || undefined
      });

      setFeedback({
        type: "success",
        text: action === "APPROVED" 
          ? `Permohonan untuk "${req.mata_kuliah_nama}" BERHASIL DISETUJUI dan jadwal otomatis dipindahkan!`
          : `Permohonan untuk "${req.mata_kuliah_nama}" telah DITOLAK.`
      });

      setActiveReviewItem(null);
      setAdminNote("");
      await loadRequests();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Gagal memproses permohonan." });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-16">
      {/* Toast Alert */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in ${
          feedback.type === "success" 
            ? "bg-emerald-50 text-emerald-900 border-emerald-300"
            : "bg-rose-50 text-rose-900 border-rose-300"
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
              <CalendarSync className="w-3.5 h-3.5 text-amber-600" />
              <span>Manajemen Reschedule Kuliah</span>
            </span>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-bold text-xs animate-pulse">
                {pendingCount} Menunggu Persetujuan
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Inbox Permohonan Ganti Jadwal Dosen
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review dan persetujuan pengajuan pergantian jadwal kuliah oleh dosen UNU. Jadwal yang disetujui otomatis berpindah tanpa bentrok.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadRequests}
            title="Muat Ulang"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>

          <Link
            href="/matrix"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Calendar className="w-4 h-4" />
            <span>Lihat Matriks Jadwal</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: "ALL", label: "Semua Permohonan" },
          { id: "PENDING", label: `Menunggu (${pendingCount})` },
          { id: "APPROVED", label: "Disetujui" },
          { id: "REJECTED", label: "Ditolak" }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`px-4 py-2 rounded-xl transition-all ${
              statusFilter === f.id
                ? "bg-slate-900 text-white shadow-xs font-bold"
                : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List of Reschedule Requests */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex justify-center items-center gap-2 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-xs font-bold">Memuat daftar permohonan...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3">
          <div className="inline-flex p-4 bg-slate-100 rounded-full text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Tidak Ada Permohonan</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tidak ada tiket permohonan pergantian jadwal yang sesuai dengan filter ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const isPending = r.status === "PENDING";
            const isApproved = r.status === "APPROVED";
            const isRejected = r.status === "REJECTED";

            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                {/* Header Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">
                        {r.dosen_nama}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        NIDN: {r.dosen_nidn || "Tidak terdaftar"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${
                      isPending 
                        ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                        : isApproved
                        ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                        : "bg-rose-100 text-rose-900 border-rose-300"
                    }`}>
                      {isPending ? "Menunggu Persetujuan" : isApproved ? "Disetujui (Approved)" : "Ditolak (Rejected)"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Course Details */}
                <div className="space-y-1">
                  <div className="font-extrabold text-base text-slate-900">
                    {r.mata_kuliah_nama}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{r.kelas_kode}</span>
                    <span>•</span>
                    <span>{r.kelas_nama}</span>
                    <span>•</span>
                    <span className="font-bold text-blue-700">{r.sks} SKS</span>
                  </div>
                </div>

                {/* Side-by-Side Comparison: Jadwal Asli vs Usulan Baru */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Asal */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Jadwal Semula (Asli)</span>
                    </div>
                    <div className="font-bold text-xs text-slate-800">
                      Hari {r.hari_asal}, {r.jam_asal}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{r.ruangan_asal}</span>
                    </div>
                  </div>

                  {/* Tujuan */}
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                      <CalendarSync className="w-3 h-3" />
                      <span>Usulan Jadwal Baru</span>
                    </div>
                    <div className="font-bold text-xs text-blue-950">
                      Hari {r.hari_tujuan}, {r.jam_tujuan}
                    </div>
                    <div className="text-xs text-blue-800 flex items-center gap-1 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{r.ruangan_tujuan} {r.ruangan_tujuan_gedung ? `(${r.ruangan_tujuan_gedung})` : ""}</span>
                    </div>
                  </div>
                </div>

                {/* Alasan Dosen */}
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                    <span>Alasan Pengajuan Dosen:</span>
                  </div>
                  <p className="text-amber-950/80 leading-relaxed italic pl-4">
                    &quot;{r.alasan}&quot;
                  </p>
                </div>

                {/* Catatan BAAK jika sudah diproses */}
                {r.catatan_baak && (
                  <div className="p-2.5 rounded-xl bg-slate-100 text-xs text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Catatan BAAK: <strong>{r.catatan_baak}</strong></span>
                  </div>
                )}

                {/* Action Buttons for Pending */}
                {isPending && (
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setActiveReviewItem({ req: r, action: "REJECTED" });
                        setAdminNote("");
                      }}
                      disabled={processingId === r.id}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all"
                    >
                      Tolak Pengajuan
                    </button>

                    <button
                      onClick={() => {
                        setActiveReviewItem({ req: r, action: "APPROVED" });
                        setAdminNote("Disetujui oleh BAAK UNU");
                      }}
                      disabled={processingId === r.id}
                      className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Setujui & Pindahkan Jadwal</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRMATION / REVIEW MODAL */}
      {activeReviewItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                {activeReviewItem.action === "APPROVED" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Konfirmasi Persetujuan Ganti Jadwal</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <span>Konfirmasi Penolakan Pengajuan</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setActiveReviewItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {activeReviewItem.action === "APPROVED" ? (
                <span>
                  Apakah Anda yakin ingin menyetujui permohonan ini? Jadwal kuliah <strong>&quot;{activeReviewItem.req.mata_kuliah_nama}&quot;</strong> akan otomatis dipindahkan ke <strong>Hari {activeReviewItem.req.hari_tujuan}, {activeReviewItem.req.jam_tujuan}</strong> di <strong>{activeReviewItem.req.ruangan_tujuan}</strong>.
                </span>
              ) : (
                <span>
                  Apakah Anda yakin ingin menolak permohonan dari <strong>{activeReviewItem.req.dosen_nama}</strong>? Jadwal kuliah tidak akan mengalami perubahan.
                </span>
              )}
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Catatan BAAK (Opsional / Alasan Penolakan):
              </label>
              <textarea
                rows={2}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Tuliskan catatan atau keterangan untuk dosen pemohon..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveReviewItem(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReview}
                disabled={Boolean(processingId)}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all ${
                  activeReviewItem.action === "APPROVED"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                    : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                }`}
              >
                {processingId ? "Memproses..." : activeReviewItem.action === "APPROVED" ? "Ya, Setujui & Pindahkan" : "Ya, Tolak Permohonan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

