import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "e-Rapor Sekolah",
  description: "Aplikasi e-Rapor: input nilai, validasi, dan cetak rapor PDF",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/master", label: "Master Data" },
  { href: "/nilai", label: "Input Nilai" },
  { href: "/validasi", label: "Validasi" },
  { href: "/impor", label: "Impor CSV" },
  { href: "/rapor", label: "Rapor" },
  { href: "/cetak", label: "Cetak Massal" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen text-slate-900">
        <nav className="bg-slate-800 text-white">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-4">
            <span className="font-bold text-lg mr-4">e-Rapor Sekolah</span>
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-sm text-slate-200 hover:text-white hover:underline">
                {n.label}
              </a>
            ))}
          </div>
        </nav>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
