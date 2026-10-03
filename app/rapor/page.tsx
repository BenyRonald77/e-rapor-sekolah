"use client";
import { useEffect, useState } from "react";

type Siswa = { id: number; nis: string; name: string; kelasId: number };
type Kelas = { id: number; name: string };
type Rekap = {
  siswa: { nis: string; name: string; kelas: { name: string } };
  mapel: {
    mapel: { name: string; kkm: number };
    komponen: { name: string; bobot: number; nilai: number | null }[];
    nilaiAkhir: number | null; predikat: string | null; deskripsi: string | null; remedial: boolean;
  }[];
  rataRata: number | null;
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

export default function Rapor() {
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [siswaId, setSiswaId] = useState("");
  const [rekap, setRekap] = useState<Rekap | null>(null);
  const [semester, setSemester] = useState("Ganjil");
  const [tahunAjaran, setTahunAjaran] = useState("2026/2027");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      setKelas(await api("/api/kelas"));
      setSiswa(await api("/api/siswa"));
    })();
  }, []);

  const lihat = async (id: string) => {
    setSiswaId(id);
    if (!id) { setRekap(null); return; }
    try { setRekap(await api(`/api/nilai/rekap?siswaId=${id}`)); setMsg(""); }
    catch (e: unknown) { setMsg("Gagal: " + (e instanceof Error ? e.message : e)); }
  };

  const cetakKelas = async () => {
    const s = siswa.find((x) => String(x.id) === siswaId);
    const kId = kelasId || s?.kelasId;
    if (!kId) { setMsg("Pilih kelas dulu"); return; }
    try {
      const j = await api("/api/print-jobs", "POST", { kelasId: Number(kId), semester, tahunAjaran });
      setMsg(`OK: print job #${j.id} masuk antrean. Pantau di halaman Cetak Massal.`);
    } catch (e: unknown) { setMsg("Gagal: " + (e instanceof Error ? e.message : e)); }
  };

  const daftar = siswa.filter((s) => !kelasId || String(s.kelasId) === kelasId);

  return (
    <div>
      <h1 className="h2">Rapor per Siswa</h1>
      {msg && <p className="mb-3 text-sm">{msg}</p>}
      <div className="card mb-4">
        <div className="flex gap-2 flex-wrap items-end">
          <label className="text-sm">Filter Kelas<br />
            <select value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
              <option value="">Semua</option>
              {kelas.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Siswa<br />
            <select value={siswaId} onChange={(e) => lihat(e.target.value)}>
              <option value="">— pilih siswa —</option>
              {daftar.map((s) => <option key={s.id} value={s.id}>{s.nis} — {s.name}</option>)}
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
          <button className="btn" onClick={cetakKelas}>Cetak Rapor Kelas Ini</button>
        </div>
      </div>

      {rekap && (
        <div className="card">
          <h2 className="h3">Pratinjau Rapor</h2>
          <p className="text-sm mb-3">
            <b>{rekap.siswa.name}</b> — NIS {rekap.siswa.nis} — Kelas {rekap.siswa.kelas.name}<br />
            Rata-rata: <b>{rekap.rataRata ?? "-"}</b>
          </p>
          <table className="data">
            <thead><tr><th>Mapel</th><th>KKM</th><th>Komponen</th><th>Nilai Akhir</th><th>Predikat</th><th>Status</th></tr></thead>
            <tbody>
              {rekap.mapel.map((m, i) => (
                <tr key={i}>
                  <td>{m.mapel.name}</td><td>{m.mapel.kkm}</td>
                  <td className="text-xs">{m.komponen.map((k) => `${k.name}(${k.bobot}): ${k.nilai ?? "-"}`).join(", ")}</td>
                  <td className="font-semibold">{m.nilaiAkhir ?? "-"}</td>
                  <td>{m.predikat ?? "-"}</td>
                  <td>{m.remedial ? <span className="text-red-700 font-semibold">Remedial</span> : "Tuntas"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="h3 mt-4">Deskripsi Capaian</h3>
          <ul className="text-sm list-disc ml-5">
            {rekap.mapel.filter((m) => m.deskripsi).map((m, i) => (
              <li key={i}><b>{m.mapel.name}</b> ({m.predikat}): {m.deskripsi}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
