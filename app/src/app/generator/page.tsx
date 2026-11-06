"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { 
  Cpu, Play, RefreshCw, CheckCircle2, AlertCircle, 
  ArrowRight, Sliders, Activity, Clock
} from "lucide-react";
import { 
  fetchActivePeriod, triggerGAJob, fetchJobStatus, fetchScheduleVersions 
} from "@/lib/api";
import { SemesterPeriode, JobGA, VersiJadwal } from "@/lib/types";

export default function GeneratorPage() {
  const [periode, setPeriode] = useState<SemesterPeriode | null>(null);
  const [population, setPopulation] = useState(60);
  const [generations, setGenerations] = useState(150);
  const [crossoverRate, setCrossoverRate] = useState(0.85);
  const [mutationRate, setMutationRate] = useState(0.08);

  const [activeJob, setActiveJob] = useState<JobGA | null>(null);
  const [versions, setVersions] = useState<VersiJadwal[]>([]);
  const [starting, setStarting] = useState(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function init() {
      const p = await fetchActivePeriod();
      setPeriode(p);
      const vList = await fetchScheduleVersions();
      setVersions(vList);
    }
    init();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  async function handleStartGA() {
    if (!periode) {
      alert("Periode semester belum dipilih.");
      return;
    }
    setStarting(true);
    try {
      const job = await triggerGAJob({
        semester_periode_id: periode.id,
        populasi: Number(population),
        generasi: Number(generations),
        mutation_rate: Number(mutationRate),
        crossover_rate: Number(crossoverRate)
      });

      if (job) {
        setActiveJob(job);
        startPolling(job.id);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menjalankan job GA.");
    } finally {
      setStarting(false);
    }
  }

  function startPolling(jobId: string) {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      const status = await fetchJobStatus(jobId);
      if (status) {
        setActiveJob(status);
        if (status.status === "COMPLETED" || status.status === "FAILED" || status.status === "CANCELLED") {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          const vList = await fetchScheduleVersions();
          setVersions(vList);
        }
      }
    }, 1200);
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <Cpu className="w-6 h-6 text-emerald-600" />
          <span>Mesin Algoritma Genetika (GA Control Room)</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Konfigurasi parameter evolusi, jalankan optimasi penjadwalan otomatis di latar belakang, dan pantau proses konvergensi secara langsung.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Configuration Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs h-fit">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900">
            <Sliders className="w-5 h-5 text-blue-600" />
            <span>Parameter Algoritma</span>
          </div>

          <div className="space-y-4 text-xs font-semibold text-slate-700">
            {/* Target Periode */}
            <div>
              <label className="block mb-1.5">Periode Semester</label>
              <input
                type="text"
                disabled
                value={periode ? `${periode.kode} (${periode.semester})` : "Memuat..."}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm font-medium"
              />
            </div>

            {/* Populasi */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label>Ukuran Populasi (Kromosom)</label>
                <span className="text-blue-600 font-bold">{population}</span>
              </div>
              <input
                type="range"
                min={20}
                max={200}
                step={10}
                value={population}
                onChange={(e) => setPopulation(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 font-normal">Rekomendasi: 50–100 individu per generasi</span>
            </div>

            {/* Generasi */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label>Jumlah Generasi (Iterasi)</label>
                <span className="text-blue-600 font-bold">{generations}</span>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={25}
                value={generations}
                onChange={(e) => setGenerations(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 font-normal">Rekomendasi: 150–250 iterasi evolusi</span>
            </div>

            {/* Crossover Rate */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label>Crossover Rate ($P_c$)</label>
                <span className="text-blue-600 font-bold">{crossoverRate}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.0}
                step={0.05}
                value={crossoverRate}
                onChange={(e) => setCrossoverRate(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Mutation Rate */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label>Mutation Rate ($P_m$)</label>
                <span className="text-blue-600 font-bold">{mutationRate}</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.25}
                step={0.01}
                value={mutationRate}
                onChange={(e) => setMutationRate(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleStartGA}
            disabled={starting || (activeJob?.status === "RUNNING")}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {starting || activeJob?.status === "RUNNING" ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Memproses Optimasi...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Jalankan Penjadwalan (Run GA)</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Execution Monitor & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Job Progress Card */}
          {activeJob ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900">Status Proses Eksekusi GA</h3>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  activeJob.status === "COMPLETED" 
                    ? "bg-emerald-100 text-emerald-800" 
                    : activeJob.status === "RUNNING"
                    ? "bg-blue-100 text-blue-800 animate-pulse"
                    : "bg-slate-100 text-slate-800"
                }`}>
                  {activeJob.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Progres Komputasi</span>
                  <span>{activeJob.progress}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                    style={{ width: `${activeJob.progress}%` }}
                  />
                </div>
              </div>

              {/* Current Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-500">Best Fitness</div>
                  <div className="text-xl font-bold text-slate-900">
                    {activeJob.fitness_terbaik ? activeJob.fitness_terbaik.toFixed(4) : "-"}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-500">Total Generasi</div>
                  <div className="text-xl font-bold text-slate-900">{activeJob.generasi}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[11px] text-slate-500">Populasi</div>
                  <div className="text-xl font-bold text-slate-900">{activeJob.populasi}</div>
                </div>
              </div>

              {activeJob.status === "COMPLETED" && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Optimasi berhasil! Jadwal multi-kandidat telah dibuat.</span>
                  </div>
                  <Link
                    href="/matrix"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0"
                  >
                    <span>Buka Hasil di Matriks</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 space-y-2">
              <Cpu className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">Klik tombol &quot;Jalankan Penjadwalan&quot; untuk memulai evolusi genetik baru.</p>
            </div>
          )}

          {/* Schedule Candidates List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Daftar Kandidat Jadwal Tersimpan</span>
            </h3>

            {versions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {versions.map((v) => (
                  <div key={v.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{v.nama}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Fitness: <span className="font-medium text-slate-700">{v.fitness_score.toFixed(4)}</span> | 
                        Pelanggaran: <span className={`font-semibold ${v.jumlah_pelanggaran === 0 ? "text-emerald-600" : "text-amber-600"}`}>{v.jumlah_pelanggaran}</span> | 
                        Status: <span className="font-semibold text-blue-700">{v.status}</span>
                      </div>
                    </div>

                    <Link
                      href="/matrix"
                      className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-semibold text-xs transition-colors"
                    >
                      Buka
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Belum ada kandidat jadwal yang tersimpan.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

