"use client";
import { useEffect, useState } from "react";

type Kelas = { id: number; name: string; waliKelas?: { id: number; name: string } | null };
type User = { id: number; name: string; role: string };
type Siswa = { id: number; nis: string; name: string; kelas: { name: string } };
type Mapel = { id: number; name: string; kkm: number; kelas?: { name: string } | null; komponen: { id: number; name: string; bobot: number }[] };

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

export default function Master() {
  const [tab, setTab] = useState<"kelas" | "siswa" | "mapel" | "komponen">("kelas");
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [mapel, setMapel] = useState<Mapel[]>([]);
  const [msg, setMsg] = useState("");

  const muat = async () => {
    const [k, u, s, m] = await Promise.all([
      api("/api/kelas"), api("/api/users"), api("/api/siswa"), api("/api/mapel"),
    ]);
    setKelas(k); setUsers(u); setSiswa(s); setMapel(m);
  };
  useEffect(() => { muat(); }, []);

  const aksi = async (fn: () => Promise<unknown>, sukses: string) => {
    try { await fn(); setMsg("OK: " + sukses); await muat(); }
    catch (e: unknown) { setMsg("Gagal: " + (e instanceof Error ? e.message : e)); }
  };

  return (
    <div>
      <h1 className="h2">Master Data</h1>
      {msg && <p className="mb-3 text-sm">{msg}</p>}
      <div className="flex gap-2 mb-4">
        {(["kelas", "siswa", "mapel", "komponen"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-sm ${tab === t ? "bg-slate-800 text-white" : "bg-white border"}`}>
            {t === "kelas" ? "Kelas" : t === "siswa" ? "Siswa" : t === "mapel" ? "Mapel" : "Komponen"}
          </button>
        ))}
      </div>

      {tab === "kelas" && (
        <div className="card">
          <h2 className="h3">Kelas</h2>
          <form className="flex gap-2 mb-4 flex-wrap" onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            aksi(() => api("/api/kelas", "POST", { name: f.get("name"), waliKelasId: f.get("wali") || null }), "kelas ditambah");
            (e.target as HTMLFormElement).reset();
          }}>
            <input name="name" placeholder="Nama kelas (mis. 7A)" required />
            <select name="wali" defaultValue="">
              <option value="">— Wali kelas —</option>
              {users.filter((u) => u.role !== "admin").map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
            <button className="btn">Tambah</button>
          </form>
          <table className="data">
            <thead><tr><th>ID</th><th>Nama</th><th>Wali Kelas</th><th>Aksi</th></tr></thead>
            <tbody>
              {kelas.map((k) => (
                <tr key={k.id}>
                  <td>{k.id}</td><td>{k.name}</td><td>{k.waliKelas?.name ?? "-"}</td>
                  <td>
                    <button className="btn-danger btn-sm" onClick={() =>
                      confirm(`Hapus kelas ${k.name}?`) && aksi(() => api(`/api/kelas/${k.id}`, "DELETE"), "kelas dihapus")}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "siswa" && (
        <div className="card">
          <h2 className="h3">Siswa</h2>
          <form className="flex gap-2 mb-4 flex-wrap" onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            aksi(() => api("/api/siswa", "POST", { nis: f.get("nis"), name: f.get("name"), kelasId: f.get("kelas") }), "siswa ditambah");
            (e.target as HTMLFormElement).reset();
          }}>
            <input name="nis" placeholder="NIS" required />
            <input name="name" placeholder="Nama siswa" required />
            <select name="kelas" required defaultValue="">
              <option value="" disabled>Kelas</option>
              {kelas.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
            <button className="btn">Tambah</button>
          </form>
          <table className="data">
            <thead><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Aksi</th></tr></thead>
            <tbody>
              {siswa.map((s) => (
                <tr key={s.id}>
                  <td>{s.nis}</td><td>{s.name}</td><td>{s.kelas.name}</td>
                  <td>
                    <button className="btn-danger btn-sm" onClick={() =>
                      confirm(`Hapus ${s.name}?`) && aksi(() => api(`/api/siswa/${s.id}`, "DELETE"), "siswa dihapus")}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "mapel" && (
        <div className="card">
          <h2 className="h3">Mata Pelajaran</h2>
          <form className="flex gap-2 mb-4 flex-wrap" onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            aksi(() => api("/api/mapel", "POST", { name: f.get("name"), kkm: Number(f.get("kkm")), kelasId: f.get("kelas") || null }), "mapel ditambah");
            (e.target as HTMLFormElement).reset();
          }}>
            <input name="name" placeholder="Nama mapel" required />
            <input name="kkm" type="number" min={0} max={100} placeholder="KKM" required className="w-24" />
            <select name="kelas" defaultValue="">
              <option value="">Semua kelas</option>
              {kelas.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
            <button className="btn">Tambah</button>
          </form>
          <table className="data">
            <thead><tr><th>ID</th><th>Nama</th><th>KKM</th><th>Kelas</th><th>Aksi</th></tr></thead>
            <tbody>
              {mapel.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td><td>{m.name}</td><td>{m.kkm}</td><td>{m.kelas?.name ?? "Semua"}</td>
                  <td>
                    <button className="btn-danger btn-sm" onClick={() =>
                      confirm(`Hapus mapel ${m.name}?`) && aksi(() => api(`/api/mapel/${m.id}`, "DELETE"), "mapel dihapus")}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "komponen" && (
        <div className="card">
          <h2 className="h3">Komponen Penilaian per Mapel</h2>
          <p className="text-sm text-slate-600 mb-3">
            Total bobot per mapel <b>harus tepat 100</b>. Simpan sebagai satu set
            (contoh: Tugas 30, UTS 30, UAS 40).
          </p>
          {mapel.map((m) => (
            <KomponenEditor key={m.id} mapel={m} onSelesai={muat} setMsg={setMsg} />
          ))}
        </div>
      )}
    </div>
  );
}

function KomponenEditor({ mapel, onSelesai, setMsg }: {
  mapel: Mapel; onSelesai: () => void; setMsg: (s: string) => void;
}) {
  const [baris, setBaris] = useState<{ name: string; bobot: string }[]>(
    mapel.komponen.map((k) => ({ name: k.name, bobot: String(k.bobot) }))
  );
  useEffect(() => {
    setBaris(mapel.komponen.map((k) => ({ name: k.name, bobot: String(k.bobot) })));
  }, [mapel]);
  const total = baris.reduce((a, b) => a + (Number(b.bobot) || 0), 0);
  return (
    <div className="border rounded p-3 mb-3 bg-slate-50">
      <div className="font-semibold mb-2">{mapel.name} <span className="text-xs font-normal text-slate-500">(KKM {mapel.kkm})</span></div>
      {baris.map((b, i) => (
        <div key={i} className="flex gap-2 mb-1">
          <input value={b.name} placeholder="Nama (mis. Tugas)"
            onChange={(e) => setBaris(baris.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
          <input value={b.bobot} type="number" min={0} max={100} placeholder="Bobot" className="w-24"
            onChange={(e) => setBaris(baris.map((x, j) => j === i ? { ...x, bobot: e.target.value } : x))} />
          <button className="btn-danger btn-sm" onClick={() => setBaris(baris.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <div className="flex gap-2 mt-2 items-center">
        <button className="btn btn-sm" onClick={() => setBaris([...baris, { name: "", bobot: "" }])}>+ Baris</button>
        <button className="btn btn-sm" onClick={async () => {
          try {
            await api("/api/komponen/set", "POST", {
              mapelId: mapel.id,
              items: baris.map((b) => ({ name: b.name, bobot: Number(b.bobot) })),
            });
            setMsg(`OK: komponen ${mapel.name} disimpan (total 100)`);
            onSelesai();
          } catch (e: unknown) { setMsg("Gagal: " + (e instanceof Error ? e.message : e)); }
        }}>Simpan Set</button>
        <span className={`text-sm ${total === 100 ? "text-green-700" : "text-red-700"}`}>Total: {total}</span>
      </div>
    </div>
  );
}
