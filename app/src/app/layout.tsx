import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistem Penjadwalan Kuliah Berbasis Algoritma Genetika - UNU",
  description: "Aplikasi Penjadwalan Kuliah Otomatis Universitas Nahdlatul Ulama berbasis Algoritma Genetika",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50/60 font-sans antialiased text-slate-800">
        <Navbar />
        <main className="w-full px-4 sm:px-8 lg:px-12 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
