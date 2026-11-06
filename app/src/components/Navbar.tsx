"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Calendar, Cpu, UploadCloud, Database, Settings2, 
  ExternalLink, Sparkles, QrCode, LogIn, LogOut, ShieldCheck,
  ArrowLeftRight
} from "lucide-react";
import { isAdminLoggedIn, getStoredUser, clearStoredAuth, AuthUser } from "@/lib/auth";
import { fetchActivePeriod } from "@/lib/api";
import { SemesterPeriode } from "@/lib/types";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activePeriod, setActivePeriod] = useState<SemesterPeriode | null>(null);

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
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>{user?.nama_lengkap || "Petugas BAAK"}</span>
                </div>
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
    </header>
  );
}
