"use client";
import { useEffect, useState } from "react";

type Job = { id: number; semester: string; tahunAjaran: string; status: string; kelas: { name: string } };

export default function Dashboard() {
  const [stats, setStats] = useState({ kelas: 0, siswa: 0, mapel: 0, user: 0 });
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    (async () => {
      const [k, s, m, u, j] = await Promise.all([
        fetch("/api/kelas").then((r) => r.json()),
        fetch("/api/siswa").then((r) => r.json()),
        fetch("/api/mapel").then((r) => r.json()),
        fetch("/api/users").then((r) => r.json()),
        fetch("/api/print-jobs").then((r) => r.json()),
      ]);
      setStats({ kelas: k.length, siswa: s.length, mapel: m.length, user: u.length });
      setJobs(j.slice(0, 5));
    })();
  }, []);

  const cards = [
    { label: "Kelas", val: stats.kelas, href: "/master" },
    { label: "Siswa", val: stats.siswa, href: "/master" },
    { label: "Mata Pelajaran", val: stats.mapel, href: "/master" },
    { label: "Pengguna", val: stats.user, href: "/master" },
  ];

  return (
    <div>
      <h1 className="h2">Dashboard e-Rapor</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <a key={c.label} href={c.href} className="card text-center hover:shadow">
            <div className="text-3xl font-bold">{c.val}</div>
            <div className="text-sm text-slate-600">{c.label}</div>
          </a>
        ))}
      </div>
      <div className="card">
        <h2 className="h3">Antrean Cetak Terakhir</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada print job.</p>
        ) : (
          <table className="data">
            <thead>
              <tr><th>ID</th><th>Kelas</th><th>Semester</th><th>Status</th></tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.id}</td><td>{j.kelas.name}</td>
                  <td>{j.semester} {j.tahunAjaran}</td><td>{j.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3 flex gap-2">
          <a href="/nilai" className="btn">Input Nilai</a>
          <a href="/cetak" className="btn">Cetak Massal</a>
        </div>
      </div>
    </div>
  );
}
