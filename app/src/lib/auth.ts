"use client";

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  nama_lengkap: string;
  role: string;
  aktif: boolean;
}

const TOKEN_KEY = "unu_ga_token";
const USER_KEY = "unu_ga_user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("auth-changed"));
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("auth-changed"));
}

export function updateStoredUser(updatedUser: Partial<AuthUser>): void {
  if (typeof window === "undefined") return;
  const current = getStoredUser();
  if (!current) return;
  const next = { ...current, ...updatedUser };
  localStorage.setItem(USER_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("auth-changed"));
}

export function isAdminLoggedIn(): boolean {
  const token = getStoredToken();
  const user = getStoredUser();
  return Boolean(token && user && ["ADMIN", "SUPERADMIN", "OPERATOR"].includes(user.role));
}

