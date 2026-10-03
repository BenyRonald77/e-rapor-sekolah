"use client";
import { useEffect, useState } from "react";

type Kelas = { id: number; name: string; waliKelas?: { id: number; name: string } | null };
type Val = {
  id: number; kelasId: number; semester: string; tahunAjaran: string;
  isLocked: boolean; validatedAt: string | null;
  kelas: { name: string }; validator?: { name: string } | null;
};

async function api(url: string, method = "GET", body?: unknown) {
  const r = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

export default function Validasi() {
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [rows, setRows] = useState<Val[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [semester, setSemester] = useState("Ganjil");
  const [tahunAjaran, setTahunAjaran] = useState("2026/2027");
  const [msg, setMsg] = useState("");

  const muat = async () => {
    setKelas(await api("/api/kelas"));
    setRows(await api("/api/validasi"));
  };
  useEffect(() => { muat(); }, []);

  const kunci = async () => {
    if (!kelasId) { setMsg("Pilih kelas dulu"); return; }
    try {
      const k = kelas.find((x) => String(x.id) === kelasId);
      const j = await api("/api/validasi", "POST", {
        kelasId: Number(kelasId), semester, tahunAjaran, validatedBy: k?.waliKelas?.id ?? null,
      });
      setMsg("OK: " + j.pesan);
      await muat();
    } catch (e: unknown) { setMsg("Gagal: " + (e instanceof Error ? e.message : e)); }
  };

  const buka = async (v: Val) => {
    const adminId = prompt("Masukkan ID user admin untuk membuka kunci:");
    if (!adminId) return;
    try {
      const j = await api("/api/validasi/unlock", "POST", {
        kelasId: v.kelasId, semester: v.semester, tahunAjaran: v.tahunAjaran, adminUserId: Number(adminId),
      });
      setMsg("OK: " + j.pesan);
      await muat();
    } catch (e: unknown) { setMsg("Gagal: " + (e instanceof Error ? e.message : e)); }
  };

  return (
    <div>
      <h1 className="h2">Validasi Nilai (Penguncian)</h1>
      {msg && <p className="mb-3 text-sm">{msg}</p>}
      <div className="card mb-4">
        <h2 className="h3">Kunci Nilai</h2>
        <div className="flex gap-2 flex-wrap items-end">
          <label className="text-sm">Kelas<br />
            <select value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
              <option value="">— pilih —</option>
              {kelas.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
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
          <button className="btn" onClick={kunci}>Kunci Nilai</button>
        </div>
        <p className="text-xs text-slate-500 mt-2">Setelah dikunci, tambah/ubah/hapus nilai untuk kelas+semester ini ditolak (409).</p>
      </div>
      <div className="card">
        <h2 className="h3">Riwayat Validasi</h2>
        <table className="data">
          <thead><tr><th>Kelas</th><th>Semester</th><th>Tahun Ajaran</th><th>Status</th><th>Divalidasi Oleh</th><th>Aksi</th></tr></thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td>{v.kelas.name}</td><td>{v.semester}</td><td>{v.tahunAjaran}</td>
                <td>{v.isLocked ? <span className="text-red-700 font-semibold">Terkunci</span> : <span className="text-green-700">Terbuka</span>}</td>
                <td>{v.validator?.name ?? "-"}</td>
                <td>{v.isLocked && <button className="btn btn-sm" onClick={() => buka(v)}>Buka (Admin)</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
