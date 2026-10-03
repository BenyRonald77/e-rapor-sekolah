# PRD — e-Rapor Sekolah

## 1. Ringkasan
Aplikasi web e-Rapor untuk sekolah: kelola data master (kelas, siswa, mapel, komponen
penilaian), input nilai, validasi/penguncian nilai oleh wali kelas, impor nilai via CSV,
dan cetak rapor massal menjadi PDF per siswa melalui antrean background job.

- **Stack:** Next.js 14 (App Router) + TypeScript + Prisma 5.22 + SQLite + Tailwind CSS
- **Bahasa UI:** Indonesia
- **Repo:** `BenyRonald77/e-rapor-sekolah`

## 2. Model Data

| Model | Field |
|---|---|
| `User` | `name`, `email` (unique), `passwordHash`, `role`: `admin` \| `walikelas` \| `guru` |
| `Kelas` | `name` (unique), `waliKelasId` → User? |
| `Siswa` | `nis` (unique), `name`, `kelasId` → Kelas |
| `Mapel` | `name`, `kkm` (0–100), `kelasId`? → Kelas (null = berlaku semua kelas) |
| `Komponen` | `mapelId` → Mapel, `name`, `bobot` (0–100); unique `(mapelId, name)` |
| `Nilai` | `siswaId` → Siswa, `komponenId` → Komponen, `nilai` (0–100); unique `(siswaId, komponenId)` |
| `Validasi` | `kelasId`, `semester`, `tahunAjaran`, `isLocked`, `validatedBy`? → User, `validatedAt`?; unique `(kelasId, semester, tahunAjaran)` |
| `PrintJob` | `kelasId`, `semester`, `tahunAjaran`, `status`: `queued` \| `processing` \| `done` \| `failed`, `resultPath`?, `log`?, `createdAt` |

## 3. Aturan Bisnis

### F1 — Master data
- CRUD Kelas (+ penunjukan wali kelas), Siswa, Mapel (+ KKM), Komponen per mapel
  (contoh: Tugas/UTS/UAS dengan bobot).
- **Total bobot semua komponen dalam satu mapel HARUS tepat 100.**
  - Simpan set komponen sekaligus (`POST /api/komponen/set`): total ≠ 100 → **400**.
  - Tambah/ubah satu komponen (`POST/PUT /api/komponen/[id]`): total > 100 → **400**.
- Hapus komponen yang sudah punya nilai → **409**. Hapus kelas/mapel yang masih
  dipakai → **409**.

### F2 — Input nilai & rekap
- Input bulk per (kelas, mapel): `POST /api/nilai/bulk`
  `{semester, tahunAjaran, entries: [{siswaId, komponenId, nilai}]}` (upsert).
- Nilai akhir siswa per mapel = **Σ(nilai × bobot) / 100**.
  Contoh: Tugas 80×30 + UTS 70×30 + UAS 90×40 → 8100/100 = **81**.
- Predikat otomatis (dikonfigurasi di `lib/rapor.ts`):
  A = 90–100, B = 80–89, C = 70–79, D = < 70.
- Deskripsi capaian otomatis dari rentang predikat (dikonfigurasi di `lib/rapor.ts`),
  mis. A: "Sangat baik dalam {mapel}, pertahankan prestasimu!"
- Flag **remedial** jika nilai akhir < KKM mapel.

### F3 — Validasi / penguncian wali kelas
- `POST /api/validasi {kelasId, semester, tahunAjaran}` → `isLocked = true`
  (mencatat `validatedBy`, `validatedAt`).
- Setelah terkunci, tambah/ubah/hapus nilai untuk kelas+semester itu → **409**
  (berlaku juga untuk impor CSV).
- Admin dapat membuka kunci: `POST /api/validasi/unlock`
  `{kelasId, semester, tahunAjaran, adminUserId}` (role harus `admin`, jika bukan → 403).
  Unlock dicatat di respons/log.

### F4 — Impor CSV
- Template kolom: `nis,komponen,nilai`.
- `POST /api/impor` (multipart: `file`, `mapelId`, `semester`, `tahunAjaran`).
- Validasi per baris: NIS harus ada, nama komponen harus cocok dengan komponen mapel,
  nilai harus angka 0–100. Baris gagal dilaporkan `{baris, alasan}`; baris valid tetap masuk.
- Hormati lock: jika kelas siswa terkunci untuk semester itu → **409** (tidak ada yang masuk).

### F5 — Cetak massal (background job)
- `POST /api/print-jobs {kelasId, semester, tahunAjaran}` → PrintJob `queued`.
- **Background job = tabel antrean `PrintJob` + worker endpoint
  `POST /api/worker/print`** yang dipicu penjadwal eksternal (cron dsb.).
  Worker mengambil job `queued` (FIFO), menandai `processing`, lalu untuk tiap siswa
  di kelas tersebut men-generate PDF rapor memakai `pdf-lib`:
  kop sekolah, identitas siswa, tabel nilai per mapel (mapel, KKM, nilai akhir,
  predikat, deskripsi, status remedial), rata-rata, dan blok tanda tangan
  (orang tua/wali, wali kelas, kepala sekolah).
- PDF disimpan di `storage/rapor/<jobId>/` (di-gitignore), job menjadi `done`
  dengan `resultPath` terisi; jika gagal → `failed` + `log` berisi pesan error.
- Unduh: `GET /api/print-jobs/[id]` mengembalikan daftar file PDF;
  `GET /api/print-jobs/[id]/unduh?file=<nama>.pdf` mengunduh satu PDF.

## 4. API (ringkas)

| Method & Path | Fungsi |
|---|---|
| GET/POST `/api/users` | daftar & tambah user |
| GET/POST `/api/kelas`, GET/PUT/DELETE `/api/kelas/[id]` | CRUD kelas |
| GET/POST `/api/siswa`, GET/PUT/DELETE `/api/siswa/[id]` | CRUD siswa (`?kelasId=`) |
| GET/POST `/api/mapel`, GET/PUT/DELETE `/api/mapel/[id]` | CRUD mapel (`?kelasId=`) |
| GET/POST `/api/komponen` (`?mapelId=`), POST `/api/komponen/set`, PUT/DELETE `/api/komponen/[id]` | komponen + validasi bobot |
| POST `/api/nilai/bulk` | input nilai bulk (upsert) |
| GET `/api/nilai/rekap` (`?kelasId=&mapelId=` atau `?siswaId=`) | rekap + predikat + remedial |
| GET/POST `/api/validasi`, POST `/api/validasi/unlock` | lock / unlock |
| GET/POST `/api/impor` | template CSV & impor |
| GET/POST `/api/print-jobs`, GET `/api/print-jobs/[id]`, GET `/api/print-jobs/[id]/unduh` | antrean cetak & unduh PDF |
| POST `/api/worker/print` | worker antrean cetak |

## 5. Halaman UI
- `/` — dashboard (ringkasan + status antrean cetak)
- `/master` — CRUD kelas, siswa, mapel, komponen
- `/nilai` — input nilai per (kelas, mapel) + rekap
- `/validasi` — kunci/buka validasi per kelas+semester
- `/impor` — unggah CSV nilai
- `/rapor` — pratinjau rapor per siswa + tombol cetak
- `/cetak` — antrean print job, jalankan worker, unduh PDF

## 6. Seed
1 admin, 1 walikelas (kelas 7A), 5 siswa, 2 mapel (Matematika KKM 75, IPA KKM 70)
+ komponen Tugas 30 / UTS 30 / UAS 40, nilai lengkap untuk 2 siswa.

## 7. Batasan / Caveat
- Tanpa autentikasi sesi/login — peran user hanya data referensi (unlock admin
  dicek via `adminUserId` di body).
- Unduh arsip ZIP tidak diimplementasikan (PDF per siswa + daftar file sudah cukup).
- Worker dipicu manual/penjadwal eksternal; tidak ada scheduler bawaan.
