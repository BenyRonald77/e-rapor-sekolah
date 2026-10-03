"use client";
import { useEffect, useState } from "react";

type Mapel = { id: number; name: string };

export default function Impor() {
  const [mapel, setMapel] = useState<Mapel[]>([]);
  const [mapelId, setMapelId] = useState("");
  const [semester, setSemester] = useState("Ganjil");
  const [tahunAjaran, setTahunAjaran] = useState("2026/2027");
  const [hasil, setHasil] = useState<{ berhasil: number; total: number; gagal: { baris: number; alasan: string }[] } | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/mapel").then((r) => r.json()).then(setMapel);
  }, []);

  const unggah = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const file = f.get("file");
    if (!(file instanceof File) || file.size === 0) { setMsg("Pilih file CSV dulu"); return; }
    if (!mapelId) { setMsg("Pilih mapel dulu"); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mapelId", mapelId);
    fd.append("semester", semester);
    fd.append("tahunAjaran", tahunAjaran);
    const r = await fetch("/api/impor", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg("Gagal: " + (j.error || r.status)); setHasil(null); return; }
    setHasil(j);
    setMsg(`OK: ${j.berhasil} dari ${j.total} baris berhasil diimpor`);
  };

  return (
    <div>
      <h1 className="h2">Impor Nilai dari CSV</h1>
      {msg && <p className="mb-3 text-sm">{msg}</p>}
      <div className="card mb-4">
        <p className="text-sm mb-2">
          Format kolom: <code>nis,komponen,nilai</code> —{" "}
          <a className="text-blue-700 underline" href={mapelId ? `/api/impor?mapelId=${mapelId}` : "/api/impor"}>
            unduh template
          </a>
        </p>
        <form onSubmit={unggah} className="flex gap-2 flex-wrap items-end">
          <label className="text-sm">Mapel<br />
            <select value={mapelId} onChange={(e) => setMapelId(e.target.value)}>
              <option value="">— pilih —</option>
              {mapel.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Semester<br />
            <select value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option>Ganjil</option><option>Genap</option>
            </select>
          </label>
          <label className="text-sm">Tahun Ajaran<br />
            <input value={tahunAjaran} onChange={(e) => setTahunAjaran(e.target.value)} className="w-28" />
          </label>
          <label className="text-sm">File CSV<br /><input type="file" name="file" accept=".csv" /></label>
          <button className="btn">Impor</button>
        </form>
      </div>
      {hasil && hasil.gagal.length > 0 && (
        <div className="card">
          <h2 className="h3">Baris Gagal ({hasil.gagal.length})</h2>
          <table className="data">
            <thead><tr><th>Baris</th><th>Alasan</th></tr></thead>
            <tbody>
              {hasil.gagal.map((g, i) => (
                <tr key={i}><td>{g.baris}</td><td>{g.alasan}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
