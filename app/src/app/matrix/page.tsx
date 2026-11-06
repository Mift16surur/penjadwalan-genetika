"use client";

import { useEffect, useState } from "react";
import { 
  Calendar, Building2, Users, BookOpen, Download, 
  AlertTriangle, CheckCircle, RefreshCw, Move, ShieldCheck,
  X, Check, Clock
} from "lucide-react";
import { 
  fetchScheduleVersions, fetchScheduleMatrix, adjustScheduleItem,
  publishScheduleVersion, getExportScheduleUrl, fetchRooms
} from "@/lib/api";
import { VersiJadwal, ScheduleMatrixResponse, Ruangan, JadwalMatrixCell } from "@/lib/types";

export default function MatrixPage() {
  const [versions, setVersions] = useState<VersiJadwal[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [viewBy, setViewBy] = useState<"room" | "lecturer" | "class">("room");
  const [matrix, setMatrix] = useState<ScheduleMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Ruangan[]>([]);

  // Move Modal State
  const [editingItem, setEditingItem] = useState<JadwalMatrixCell | null>(null);
  const [targetRoomId, setTargetRoomId] = useState<string>("");
  const [targetHariId, setTargetHariId] = useState<number>(1);
  const [targetSlotId, setTargetSlotId] = useState<string>("");
  const [moveError, setMoveError] = useState<string>("");
  const [moving, setMoving] = useState(false);

  // Load versions
  useEffect(() => {
    async function init() {
      const vList = await fetchScheduleVersions();
      setVersions(vList);
      if (vList.length > 0) {
        setSelectedVersionId(vList[0].id);
      }
      const rList = await fetchRooms();
      setRooms(rList);
    }
    init();
  }, []);

  // Load matrix whenever selectedVersionId or viewBy changes
  useEffect(() => {
    if (!selectedVersionId) return;
    loadMatrix(selectedVersionId, viewBy);
  }, [selectedVersionId, viewBy]);

  async function loadMatrix(vId: string, view: "room" | "lecturer" | "class") {
    setLoading(true);
    try {
      const data = await fetchScheduleMatrix(vId, view);
      setMatrix(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    if (!selectedVersionId) return;
    if (confirm("Apakah Anda yakin ingin mempublikasikan versi jadwal ini sebagai jadwal resmi kampus?")) {
      const ok = await publishScheduleVersion(selectedVersionId);
      if (ok) {
        alert("Versi jadwal berhasil dipublikasikan!");
        const vList = await fetchScheduleVersions();
        setVersions(vList);
      }
    }
  }

  function openMoveModal(item: JadwalMatrixCell) {
    setEditingItem(item);
    setTargetRoomId(item.ruangan_id);
    setTargetHariId(item.hari_id);
    setMoveError("");

    if (matrix && matrix.time_slots.length > 0) {
      const s = matrix.time_slots.find(x => x.nomor === item.slot_mulai_nomor);
      if (s) setTargetSlotId(s.id);
      else setTargetSlotId(matrix.time_slots[0].id);
    }
  }

  async function handleConfirmMove() {
    if (!editingItem || !targetRoomId || !targetSlotId) return;
    setMoving(true);
    setMoveError("");

    const res = await adjustScheduleItem(editingItem.jadwal_id, {
      ruangan_id: targetRoomId,
      hari_id: Number(targetHariId),
      slot_mulai_id: targetSlotId
    });

    setMoving(false);
    if (!res.success) {
      setMoveError(res.message || "Gagal memindahkan jadwal");
    } else {
      setEditingItem(null);
      await loadMatrix(selectedVersionId, viewBy);
    }
  }

  const selectedVersion = versions.find(v => v.id === selectedVersionId);

  return (
    <div className="w-full space-y-6">
      {/* Header & Controls Full Width */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600 shrink-0" />
            <span>Matriks Jadwal Perkuliahan</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Visualisasi pemetaan jadwal perkuliahan, deteksi bentrok, dan penyesuaian posisi manual.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Candidate Version Selector */}
          <div className="flex-1 xl:flex-initial">
            <select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              className="w-full xl:w-auto px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-sm sm:text-base font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs transition-colors"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nama} {v.status === "PUBLISHED" ? "⭐ (PUBLISHED)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Export to Excel */}
          {selectedVersionId && (
            <a
              href={getExportScheduleUrl(selectedVersionId)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm sm:text-base font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <Download className="w-5 h-5" />
              <span>Ekspor Excel</span>
            </a>
          )}

          {/* Publish Button */}
          {selectedVersion && selectedVersion.status !== "PUBLISHED" && (
            <button
              onClick={handlePublish}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white text-sm sm:text-base font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Publikasikan</span>
            </button>
          )}
        </div>
      </div>

      {/* Perspective Switcher & Health Status Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Tab Perspective */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewBy("room")}
            className={`flex items-center gap-2.5 px-5 py-2.5 text-sm sm:text-base font-bold rounded-lg transition-all ${
              viewBy === "room"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <span>Per Ruangan</span>
          </button>

          <button
            onClick={() => setViewBy("lecturer")}
            className={`flex items-center gap-2.5 px-5 py-2.5 text-sm sm:text-base font-bold rounded-lg transition-all ${
              viewBy === "lecturer"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            <span>Per Dosen</span>
          </button>

          <button
            onClick={() => setViewBy("class")}
            className={`flex items-center gap-2.5 px-5 py-2.5 text-sm sm:text-base font-bold rounded-lg transition-all ${
              viewBy === "class"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            <span>Per Rombel Kelas</span>
          </button>
        </div>

        {/* Quality status badge */}
        {matrix && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 font-semibold shadow-2xs">
              <span className="text-slate-500">Fitness:</span>
              <span className="font-extrabold text-blue-700 font-mono text-base">{matrix.fitness_score.toFixed(4)}</span>
            </div>

            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border shadow-2xs ${
              matrix.total_violations === 0 
                ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                : "bg-amber-50 text-amber-800 border-amber-300"
            }`}>
              {matrix.total_violations === 0 ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>0 Bentrok (Jadwal Sempurna)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{matrix.total_violations} Pelanggaran Soft Constraint</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Matrix Table Full Width Container */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-20 flex flex-col items-center justify-center text-slate-400 gap-4 shadow-xs">
          <RefreshCw className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-base font-bold text-slate-700">Memuat matriks jadwal...</p>
        </div>
      ) : matrix && matrix.columns.length > 0 ? (
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-max">
              <thead>
                <tr className="bg-slate-900 text-white font-bold divide-x divide-slate-800">
                  <th className="p-4 w-32 sticky left-0 z-20 bg-slate-900 text-sm text-center tracking-wider">
                    Hari
                  </th>
                  <th className="p-4 w-36 sticky left-32 z-20 bg-slate-900 text-sm text-center tracking-wider">
                    Waktu
                  </th>
                  {matrix.columns.map((col) => (
                    <th key={col.id} className="p-4 min-w-[240px] max-w-[280px] text-center">
                      <div className="text-base font-extrabold text-white tracking-wide">{col.kode}</div>
                      <div className="text-xs font-semibold text-slate-300 truncate mt-0.5">{col.nama}</div>
                      {col.kapasitas && (
                        <div className="text-xs text-amber-300 font-bold font-mono mt-0.5">
                          Kapasitas: {col.kapasitas} kursi
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matrix.days.map((day) => (
                  matrix.time_slots.map((slot, sIdx) => {
                    const isFirstSlotOfDay = sIdx === 0;
                    return (
                      <tr key={`${day.id}_${slot.nomor}`} className="hover:bg-slate-50/70 divide-x divide-slate-200">
                        {isFirstSlotOfDay && (
                          <td
                            rowSpan={matrix.time_slots.length}
                            className="p-4 font-black text-slate-800 align-top bg-slate-100/90 sticky left-0 z-10 border-r border-slate-300 text-center"
                          >
                            <span className="inline-block px-3.5 py-1.5 rounded-lg bg-blue-700 text-white font-extrabold text-sm shadow-xs uppercase tracking-wider">
                              {day.nama}
                            </span>
                          </td>
                        )}
                        <td className="p-3 text-slate-600 font-mono sticky left-32 z-10 bg-white whitespace-nowrap text-center border-r border-slate-200">
                          <div className="text-xs font-bold text-slate-800">{slot.jam_mulai} - {slot.jam_selesai}</div>
                          <div className="text-[11px] font-semibold text-blue-600 mt-0.5">Slot {slot.nomor} ({slot.shift})</div>
                        </td>

                        {/* Columns */}
                        {matrix.columns.map((col) => {
                          const cellKey = `${col.id}_${day.id}_${slot.nomor}`;
                          const cellData = matrix.cells[cellKey];

                          if (!cellData) {
                            return (
                              <td key={col.id} className="p-3 text-center text-slate-300 bg-slate-50/20">
                                <span className="text-xs">-</span>
                              </td>
                            );
                          }

                          // If it is the starting slot of the class session
                          if (cellData.is_start) {
                            return (
                              <td
                                key={col.id}
                                rowSpan={cellData.durasi_slot}
                                className="p-3 align-top bg-gradient-to-b from-blue-50 to-indigo-50/40 border-2 border-blue-500 rounded-xl shadow-xs hover:border-blue-700 transition-all"
                              >
                                <div className="space-y-2">
                                  {/* Badges */}
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="px-2 py-0.5 rounded-md bg-blue-700 text-white font-extrabold text-xs tracking-wide shadow-2xs">
                                      {cellData.kode_kelas}
                                    </span>
                                    <span className="text-xs font-bold text-indigo-950 bg-indigo-100 px-2 py-0.5 rounded-md font-mono">
                                      {cellData.sks} SKS
                                    </span>
                                  </div>

                                  {/* Subject Title */}
                                  <div className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
                                    {cellData.nama_kelas}
                                  </div>

                                  {/* Lecturer */}
                                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 line-clamp-1">
                                    <span>👤</span>
                                    <span>{cellData.dosen}</span>
                                  </div>

                                  {/* Room & Move Button */}
                                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 pt-2 border-t border-blue-200/80">
                                    <span className="flex items-center gap-1 truncate">
                                      <span>📍</span>
                                      <span>{cellData.nama_ruang}</span>
                                    </span>
                                    <button
                                      onClick={() => openMoveModal(cellData)}
                                      className="px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs flex items-center gap-1 transition-all shadow-2xs cursor-pointer shrink-0"
                                      title="Pindahkan / Geser Jadwal"
                                    >
                                      <Move className="w-3.5 h-3.5" />
                                      <span>Geser</span>
                                    </button>
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          // Middle of multi-slot session, handled by rowSpan
                          return null;
                        })}
                      </tr>
                    );
                  })
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center text-slate-500 text-base font-semibold">
          Belum ada jadwal yang dihasilkan untuk versi ini.
        </div>
      )}

      {/* Move / Adjust Schedule Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
                <Move className="w-5 h-5 text-blue-600" />
                <span>Pindahkan Posisi Jadwal</span>
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
              <div className="font-extrabold text-blue-950 text-base">{editingItem.nama_kelas}</div>
              <div className="text-xs text-blue-900 font-medium">
                Dosen: <span className="font-bold">{editingItem.dosen}</span> | Durasi: <span className="font-bold">{editingItem.durasi_slot} slot ({editingItem.sks} SKS)</span>
              </div>
            </div>

            {moveError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
                <span>{moveError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs font-bold text-slate-700">
              {/* Target Ruang */}
              <div>
                <label className="block mb-1.5 text-sm">Pilih Ruangan Baru</label>
                <select
                  value={targetRoomId}
                  onChange={(e) => setTargetRoomId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white font-medium text-sm focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.kode} - {r.nama} ({r.kapasitas} kursi, {r.jenis})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Hari */}
              <div>
                <label className="block mb-1.5 text-sm">Pilih Hari</label>
                <select
                  value={targetHariId}
                  onChange={(e) => setTargetHariId(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white font-medium text-sm focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={1}>Senin</option>
                  <option value={2}>Selasa</option>
                  <option value={3}>Rabu</option>
                  <option value={4}>Kamis</option>
                  <option value={5}>Jumat</option>
                  <option value={6}>Sabtu</option>
                </select>
              </div>

              {/* Target Slot Mulai */}
              <div>
                <label className="block mb-1.5 text-sm">Pilih Slot Waktu Mulai</label>
                <select
                  value={targetSlotId}
                  onChange={(e) => setTargetSlotId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white font-medium text-sm focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {matrix?.time_slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      Slot {s.nomor} ({s.jam_mulai} - {s.jam_selesai}) - {s.shift}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmMove}
                disabled={moving}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {moving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
