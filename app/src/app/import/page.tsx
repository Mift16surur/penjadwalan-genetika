"use client";

import { useEffect, useState } from "react";
import { 
  UploadCloud, Download, FileSpreadsheet, CheckCircle2, 
  AlertTriangle, RefreshCw, Layers, Check, Info
} from "lucide-react";
import { fetchActivePeriod, getExcelTemplateUrl, uploadExcelData } from "@/lib/api";
import { SemesterPeriode } from "@/lib/types";

export default function ImportPage() {
  const [periode, setPeriode] = useState<SemesterPeriode | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    async function init() {
      const p = await fetchActivePeriod();
      setPeriode(p);
    }
    init();
  }, []);

  async function handleUpload() {
    if (!selectedFile || !periode) {
      alert("Pilih file Excel dan pastikan periode aktif tersedia.");
      return;
    }
    setUploading(true);
    setErrorMsg("");
    setReport(null);

    try {
      const res = await uploadExcelData(selectedFile, periode.id);
      setReport(res.report);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengunggah file Excel.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <UploadCloud className="w-6 h-6 text-purple-600" />
          <span>Impor Data & Unduh Template Excel</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Unduh format template resmi yang kompatibel dengan sistem, lengkapi data perkuliahan, lalu unggah untuk persiapan jadwal otomatis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* CARD 1: DOWNLOAD TEMPLATE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 font-bold text-slate-900">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>1. Unduh Template Excel Resmi</span>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              File template telah disesuaikan dengan format sistem penjadwalan UNU dan terdiri dari 5 sheet terstruktur:
            </p>

            <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                <div><strong>Petunjuk:</strong> Panduan pengisian & aturan nama kolom.</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                <div><strong>Fakultas & Prodi:</strong> Master fakultas (FST, FSEH, FAI) dan program studi.</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                <div><strong>Ruangan:</strong> Kapasitas kursi dan jenis (KELAS, LABORATORIUM, GAZEBO, AULA).</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
                <div><strong>Dosen:</strong> NIDN, Nama, Gelar, dan prodi pengampu.</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">5</span>
                <div><strong>Mata Kuliah & Kelas:</strong> Rombel kelas, jumlah mahasiswa, serta <em>Dosen Pengampu 1 & 2 (Team Teaching)</em>.</div>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <a
              href={getExcelTemplateUrl()}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Template Format (.xlsx)</span>
            </a>
          </div>
        </div>

        {/* CARD 2: UPLOAD & IMPORT EXCEL */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 font-bold text-slate-900">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              <span>2. Unggah File Excel Data</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Target Periode Semester</label>
              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
                {periode ? `${periode.kode} - Status: ${periode.status}` : "Memuat periode..."}
              </div>
            </div>

            {/* File Dropzone */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Pilih File (.xlsx / .xls)</label>
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    {selectedFile ? selectedFile.name : "Klik atau seret file Excel ke sini"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Maksimal 15 MB format XLSX</p>
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses Impor Data...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Unggah & Impor ke Database</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* IMPORT REPORT */}
      {report && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-700 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Laporan Hasil Impor Data Sukses</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs text-slate-500">Ruangan Baru</div>
              <div className="text-xl font-bold text-slate-900">{report.ruangan_count}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs text-slate-500">Dosen Baru</div>
              <div className="text-xl font-bold text-slate-900">{report.dosen_count}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs text-slate-500">Mata Kuliah Baru</div>
              <div className="text-xl font-bold text-slate-900">{report.mata_kuliah_count}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs text-slate-500">Kelas Rombel Baru</div>
              <div className="text-xl font-bold text-slate-900">{report.kelas_count}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

