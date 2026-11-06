"use client";

import { useEffect, useState } from "react";
import { 
  Settings2, ShieldAlert, Award, Save, RefreshCw, 
  CheckCircle2, Info
} from "lucide-react";
import { fetchRules, updateRuleWeight } from "@/lib/api";
import { AturanJadwal } from "@/lib/types";

export default function RulesPage() {
  const [rules, setRules] = useState<AturanJadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchRules();
        setRules(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave(rule: AturanJadwal) {
    setSavingId(rule.id);
    setSavedSuccess(null);
    try {
      await updateRuleWeight(rule.id, rule.bobot, rule.aktif);
      setSavedSuccess(rule.id);
      setTimeout(() => setSavedSuccess(null), 2500);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan perubahan bobot.");
    } finally {
      setSavingId(null);
    }
  }

  function handleWeightChange(id: string, newBobot: number) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, bobot: newBobot } : r));
  }

  function handleToggleActive(id: string, newAktif: boolean) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, aktif: newAktif } : r));
  }

  const hardRules = rules.filter(r => r.tipe === "HARD");
  const softRules = rules.filter(r => r.tipe === "SOFT");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <Settings2 className="w-6 h-6 text-amber-600" />
          <span>Aturan Penjadwalan & Bobot Penalti</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Konfigurasi bobot penalti untuk Hard Constraints (wajib terpenuhi) dan Soft Constraints (optimasi kualitas jadwal).
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex justify-center items-center gap-2 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat aturan...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* HARD CONSTRAINTS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-red-950">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>Hard Constraints (Wajib 0 Pelanggaran)</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Pelanggaran aturan ini menghasilkan jadwal yang tidak layak (*infeasible*). Penalti diatur sangat tinggi agar GA memprioritaskan penyelesaiannya.
            </p>

            <div className="space-y-4 pt-2">
              {hardRules.map((rule) => (
                <div key={rule.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        {rule.kode}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs mt-1">{rule.nama}</h4>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.aktif}
                        onChange={(e) => handleToggleActive(rule.id, e.target.checked)}
                        className="rounded accent-red-600 cursor-pointer"
                      />
                      <span className="text-[11px] font-medium text-slate-600">Aktif</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Penalti:</span>
                      <input
                        type="number"
                        value={rule.bobot}
                        onChange={(e) => handleWeightChange(rule.id, Number(e.target.value))}
                        className="w-24 p-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <button
                      onClick={() => handleSave(rule)}
                      disabled={savingId === rule.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {savingId === rule.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : savedSuccess === rule.id ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{savedSuccess === rule.id ? "Tersimpan" : "Simpan"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SOFT CONSTRAINTS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-blue-950">
              <Award className="w-5 h-5 text-blue-600" />
              <span>Soft Constraints (Optimasi Kenyamanan)</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Aturan kenyamanan jadwal seperti jeda mengajar dosen, pengurangan jam kosong mahasiswa, dan sebaran hari kuliah yang seimbang.
            </p>

            <div className="space-y-4 pt-2">
              {softRules.map((rule) => (
                <div key={rule.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                        {rule.kode}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs mt-1">{rule.nama}</h4>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.aktif}
                        onChange={(e) => handleToggleActive(rule.id, e.target.checked)}
                        className="rounded accent-blue-600 cursor-pointer"
                      />
                      <span className="text-[11px] font-medium text-slate-600">Aktif</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Bobot:</span>
                      <input
                        type="number"
                        value={rule.bobot}
                        onChange={(e) => handleWeightChange(rule.id, Number(e.target.value))}
                        className="w-24 p-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <button
                      onClick={() => handleSave(rule)}
                      disabled={savingId === rule.id}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {savingId === rule.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : savedSuccess === rule.id ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{savedSuccess === rule.id ? "Tersimpan" : "Simpan"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

