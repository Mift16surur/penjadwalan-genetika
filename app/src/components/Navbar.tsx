"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Calendar, Cpu, UploadCloud, Database, Settings2, 
  ExternalLink, Sparkles, QrCode, LogIn, LogOut, ShieldCheck,
  ArrowLeftRight, KeyRound, User as UserIcon, Lock, X, Check, AlertTriangle
} from "lucide-react";
import { isAdminLoggedIn, getStoredUser, clearStoredAuth, AuthUser, updateStoredUser } from "@/lib/auth";
import { fetchActivePeriod, changePassword, updateProfile } from "@/lib/api";
import { SemesterPeriode } from "@/lib/types";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activePeriod, setActivePeriod] = useState<SemesterPeriode | null>(null);

  // Profile & Password Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"password" | "profile">("password");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [modalFeedback, setModalFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      setIsAdmin(isAdminLoggedIn());
      setUser(getStoredUser());
    };
    const loadPeriod = async () => {
      try {
        const p = await fetchActivePeriod();
        setActivePeriod(p);
      } catch (err) {
        // Fallback default
      }
    };

    checkAuth();
    loadPeriod();

    window.addEventListener("auth-changed", checkAuth);
    window.addEventListener("period-changed", loadPeriod);
    return () => {
      window.removeEventListener("auth-changed", checkAuth);
      window.removeEventListener("period-changed", loadPeriod);
    };
  }, []);

  const openProfileModal = () => {
    if (user) {
      setEditFullName(user.nama_lengkap || "");
      setEditUsername(user.username || "");
      setEditEmail(user.email || "");
    }
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setModalFeedback(null);
    setIsProfileModalOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalFeedback(null);
    if (!oldPassword || !newPassword) {
      setModalFeedback({ type: "error", text: "Mohon isi semua kolom password." });
      return;
    }
    if (newPassword.length < 5) {
      setModalFeedback({ type: "error", text: "Password baru minimal 5 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setModalFeedback({ type: "error", text: "Konfirmasi password baru tidak cocok." });
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(oldPassword, newPassword);
      setModalFeedback({ type: "success", text: "Password berhasil diubah!" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setModalFeedback(null);
      }, 1800);
    } catch (err: any) {
      setModalFeedback({ type: "error", text: err.message || "Gagal mengubah password." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalFeedback(null);
    if (!editFullName.trim() || !editUsername.trim()) {
      setModalFeedback({ type: "error", text: "Nama Lengkap dan Username wajib diisi." });
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateProfile({
        nama_lengkap: editFullName.trim(),
        username: editUsername.trim(),
        email: editEmail.trim() || undefined
      });
      updateStoredUser({
        nama_lengkap: updated.nama_lengkap,
        username: updated.username,
        email: updated.email
      });
      setUser(getStoredUser());
      setModalFeedback({ type: "success", text: "Profil berhasil diperbarui!" });
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setModalFeedback(null);
      }, 1500);
    } catch (err: any) {
      setModalFeedback({ type: "error", text: err.message || "Gagal memperbarui profil." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearStoredAuth();
    router.push("/jadwal");
  };

  // Nav Items:
  // Public always sees "Portal Jadwal" & "Matriks Jadwal"
  // Admin sees full management
  const navItems = [
    { href: "/jadwal", label: "Portal Jadwal (Publik)", icon: QrCode, isPublic: true },
    { href: "/matrix", label: "Matriks Jadwal", icon: Calendar, isPublic: true },
    { href: "/request-jadwal", label: "Permohonan Ganti", icon: ArrowLeftRight, requiresAdmin: true },
    { href: "/master", label: "Master Data", icon: Database, requiresAdmin: true },
    { href: "/generator", label: "Mesin GA", icon: Cpu, requiresAdmin: true },
    { href: "/import", label: "Impor Data", icon: UploadCloud, requiresAdmin: true },
    { href: "/rules", label: "Aturan & Bobot", icon: Settings2, requiresAdmin: true },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="w-full px-4 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/jadwal" className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <span className="text-base font-bold bg-gradient-to-r from-blue-900 to-indigo-800 bg-clip-text text-transparent">
                  SIM Jadwal GA
                </span>
                <span className="block text-xs text-slate-500 font-medium">Universitas Nahdlatul Ulama</span>
              </div>
            </Link>
            <div className="hidden lg:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              {activePeriod ? `${activePeriod.semester} ${activePeriod.tahun_ajaran}` : "Gasal 2026/2027"}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              if (item.requiresAdmin && !isAdmin) return null;
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Action Links & Auth Controls */}
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openProfileModal}
                  title="Klik untuk Ubah Profil atau Ganti Password"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-95 border border-blue-200 text-blue-800 text-xs font-bold transition-all group"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span>{user?.nama_lengkap || "Petugas BAAK"}</span>
                  <KeyRound className="w-3 h-3 text-blue-500 opacity-60 group-hover:opacity-100 ml-0.5" />
                </button>
                <button
                  type="button"
                  onClick={openProfileModal}
                  title="Kelola Akun & Ganti Password"
                  className="sm:hidden inline-flex items-center justify-center p-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 transition-all"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                <button
                  onClick={handleLogout}
                  title="Logout Administrator"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login Petugas BAAK</span>
              </Link>
            )}

            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noreferrer"
              title="OpenAPI Swagger"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 rounded-xl transition-colors"
            >
              <span>Swagger</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Modal Kelola Akun & Ganti Password */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Pengaturan Akun Petugas</h3>
                  <p className="text-xs text-slate-500">
                    Akun: <span className="font-semibold text-blue-600">@{user?.username || "admin"}</span> ({user?.role || "admin"})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-100 bg-slate-50/40 p-1.5 gap-1.5 mx-6 mt-4 rounded-xl border">
              <button
                type="button"
                onClick={() => { setProfileTab("password"); setModalFeedback(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                  profileTab === "password"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Ganti Password</span>
              </button>
              <button
                type="button"
                onClick={() => { setProfileTab("profile"); setModalFeedback(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
                  profileTab === "profile"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Edit Profil</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {modalFeedback && (
                <div
                  className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                    modalFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {modalFeedback.type === "success" ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{modalFeedback.text}</span>
                </div>
              )}

              {profileTab === "password" ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password Lama
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Masukkan password saat ini"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password Baru
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={5}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 5 karakter"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Konfirmasi Password Baru
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={5}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi password baru"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all"
                    >
                      {submitting ? "Menyimpan..." : "Simpan Password Baru"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="Contoh: Administrator BAAK"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Username (Login)
                    </label>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="Contoh: admin"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Contoh: baak@unu-jogja.ac.id"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-xs transition-all"
                    >
                      {submitting ? "Menyimpan..." : "Perbarui Profil"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
