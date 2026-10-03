"use client";
import { useEffect, useState } from "react";

type Kelas = { id: number; name: string };
type Mapel = { id: number; name: string; kkm: number };
type Komp = { id: number; name: string; bobot: number };
type Row = {
  siswa: { id: number; nis: string; name: string };
  komponen: { komponenId: number; name: string; bobot: number; nilai: number | null }[];
  nilaiAkhir: number | null; predikat: string | null; deskripsi: string | null; remedial: boolean;
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

export default function Nilai() {
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [mapel, setMapel] = useState<Mapel[]>([]);
  const [kelasId, setKelasId] = useState("");
  const [mapelId, setMapelId] = useState("");
  const [semester, setSemester] = useState("Ganjil");
  const [tahunAjaran, setTahunAjaran] = useState("2026/2027");
  const [komponen, setKomponen] = useState<Komp[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [bobotInfo, setBobotInfo] = useState("");

  useEffect(() => {
    (async () => {
      setKelas(await api("/api/kelas"));
      setMapel(await api("/api/mapel"));
    })();
  }, []);

  const muat = async () => {
    if (!kelasId || !mapelId) return;
    try {
      const j = await api(`/api/nilai/rekap?kelasId=${kelasId}&mapelId=${mapelId}`);
      setKomponen(j.mapel ? (await api(`/api/mapel/${mapelId}`)).komponen : []);
      setRows(j.rows);
      setBobotInfo(`Total bobot: ${j.totalBobot}${j.bobotValid ? " (valid)" : " (TIDAK VALID, harus 100)"}`);
      const e: Record<string, string> = {};
      for (const r of j.rows)
        for (const k of r.komponen)
          if (k.nilai !== null) e[`${r.siswa.id}-${k.komponenId}`] = String(k.nilai);
      setEdit(e);
      setMsg("");
    } catch (e: unknown) { setMsg("Gagal: " + (e instanceof Error ? e.message : e)); }
  };

  useEffect(() => { muat(); }, [kelasId, mapelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const simpan = async () => {
    const entries: { siswaId: number; komponenId: number; nilai: number }[] = [];
    for (const r of rows)
      for (const k of r.komponen) {
        const v = edit[`${r.siswa.id}-${k.komponenId}`];
        if (v !== undefined && v !== "") {
          const n = Number(v);
          if (!Number.isInteger(n) || n < 0 || n > 100) {
            setMsg(`Gagal: nilai ${r.siswa.name} - ${k.name} harus 0-100`);
            return;
          }
          entries.push({ siswaId: r.siswa.id, komponenId: k.komponenId, nilai: n });
        }
      }
    if (entries.length === 0) { setMsg("Tidak ada nilai untuk disimpan"); return; }
    try {
      const j = await api("/api/nilai/bulk", "POST", { semester, tahunAjaran, entries });
      setMsg(`OK: ${j.disimpan} nilai disimpan`);
      await muat();
    } catch (e: unknown) { setMsg("Gagal: " + (e instanceof Error ? e.message : e)); }
  };

  return (
    <div>
      <h1 className="h2">Input Nilai</h1>
      {msg && <p className="mb-3 text-sm">{msg}</p>}
      <div className="card mb-4">
        <div className="flex gap-2 flex-wrap items-end">
          <label className="text-sm">Kelas<br />
            <select value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
              <option value="">— pilih —</option>
              {kelas.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Mapel<br />
            <select value={mapelId} onChange={(e) => setMapelId(e.target.value)}>
              <option value="">— pilih —</option>
              {mapel.map((m) => <option key={m.id} value={m.id}>{m.name} (KKM {m.kkm})</option>)}
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
        </div>
        {bobotInfo && <p className="text-sm mt-2">{bobotInfo}</p>}
      </div>

      {rows.length > 0 && (
        <div className="card">
          <table className="data">
            <thead>
              <tr>
                <th>NIS</th><th>Nama</th>
                {komponen.map((k) => <th key={k.id}>{k.name} ({k.bobot})</th>)}
                <th>Akhir</th><th>Predikat</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.siswa.id}>
                  <td>{r.siswa.nis}</td><td>{r.siswa.name}</td>
                  {r.komponen.map((k) => (
                    <td key={k.komponenId}>
                      <input className="w-16" type="number" min={0} max={100}
                        value={edit[`${r.siswa.id}-${k.komponenId}`] ?? ""}
                        onChange={(e) => setEdit({ ...edit, [`${r.siswa.id}-${k.komponenId}`]: e.target.value })} />
                    </td>
                  ))}
                  <td className="font-semibold">{r.nilaiAkhir ?? "-"}</td>
                  <td>{r.predikat ?? "-"}</td>
                  <td>{r.remedial ? <span className="text-red-700 font-semibold">Remedial</span> : r.nilaiAkhir !== null ? <span className="text-green-700">Tuntas</span> : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn mt-3" onClick={simpan}>Simpan Nilai</button>
          <div className="mt-4">
            <h3 className="h3">Deskripsi Capaian</h3>
            <ul className="text-sm list-disc ml-5">
              {rows.filter((r) => r.deskripsi).map((r) => (
                <li key={r.siswa.id}><b>{r.siswa.name}</b> ({r.predikat}): {r.deskripsi}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
