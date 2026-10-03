"use client";
import { useEffect, useState } from "react";

type Job = {
  id: number; semester: string; tahunAjaran: string; status: string;
  resultPath: string | null; log: string | null; createdAt: string;
  kelas: { name: string };
};
type FileInfo = { name: string; size: number; url: string };

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

export default function Cetak() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [detail, setDetail] = useState<{ files: FileInfo[] } | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const muat = async () => setJobs(await api("/api/print-jobs"));
  useEffect(() => { muat(); }, []);

  const jalankanWorker = async () => {
    try {
      const j = await api("/api/worker/print", "POST");
      setMsg(`OK: worker memproses ${j.diproses} job — ` + j.results.map((r: { jobId: number; status: string; files?: number }) => `#${r.jobId}:${r.status}${r.files ? `(${r.files} PDF)` : ""}`).join(", "));
      await muat();
    } catch (e: unknown) { setMsg("Gagal: " + (e instanceof Error ? e.message : e)); }
  };

  const lihatFile = async (id: number) => {
    try {
      const j = await api(`/api/print-jobs/${id}`);
      setDetail(j);
      setDetailId(id);
    } catch (e: unknown) { setMsg("Gagal: " + (e instanceof Error ? e.message : e)); }
  };

  return (
    <div>
      <h1 className="h2">Cetak Massal (Antrean)</h1>
      {msg && <p className="mb-3 text-sm">{msg}</p>}
      <div className="card mb-4">
        <button className="btn" onClick={jalankanWorker}>Jalankan Worker Sekarang</button>
        <p className="text-xs text-slate-500 mt-2">
          Di produksi, endpoint <code>POST /api/worker/print</code> dipicu penjadwal eksternal (cron).
        </p>
      </div>
      <div className="card">
        <h2 className="h3">Daftar Print Job</h2>
        <table className="data">
          <thead><tr><th>ID</th><th>Kelas</th><th>Semester</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.id}</td><td>{j.kelas.name}</td>
                <td>{j.semester} {j.tahunAjaran}</td>
                <td>
                  <span className={j.status === "done" ? "text-green-700 font-semibold" : j.status === "failed" ? "text-red-700 font-semibold" : "text-amber-700"}>
                    {j.status}
                  </span>
                </td>
                <td className="text-xs">{new Date(j.createdAt).toLocaleString("id-ID")}</td>
                <td>
                  {j.status === "done" && (
                    <button className="btn btn-sm" onClick={() => lihatFile(j.id)}>Lihat File</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detail && (
        <div className="card mt-4">
          <h2 className="h3">File PDF — Job #{detailId} ({detail.files.length} file)</h2>
          <ul className="text-sm list-disc ml-5">
            {detail.files.map((f) => (
              <li key={f.name}>
                <a className="text-blue-700 underline" href={f.url}>{f.name}</a>
                <span className="text-slate-500"> ({Math.round(f.size / 1024)} KB)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
