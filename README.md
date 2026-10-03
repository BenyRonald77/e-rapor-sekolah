# e-Rapor Sekolah

Aplikasi e-Rapor: master data (kelas, siswa, mapel, komponen penilaian),
input nilai, validasi/penguncian oleh wali kelas, impor nilai via CSV,
dan cetak rapor massal menjadi PDF per siswa lewat antrean background job.

## Cara Menjalankan

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

## Halaman

| Halaman | Fungsi |
|---|---|
| `/` | Dashboard ringkasan + antrean cetak terakhir |
| `/master` | CRUD kelas, siswa, mapel, komponen (total bobot harus 100) |
| `/nilai` | Input nilai per (kelas, mapel) + rekap predikat & remedial |
| `/validasi` | Kunci/buka validasi nilai per kelas+semester |
| `/impor` | Impor nilai dari CSV (kolom: nis,komponen,nilai) |
| `/rapor` | Pratinjau rapor per siswa + tombol cetak |
| `/cetak` | Antrean print job, jalankan worker, unduh PDF |

## API

- `GET/POST /api/kelas`, `GET/PUT/DELETE /api/kelas/[id]`
- `GET/POST /api/siswa`, `GET/PUT/DELETE /api/siswa/[id]`
- `GET/POST /api/mapel`, `GET/PUT/DELETE /api/mapel/[id]`
- `GET/POST /api/komponen`, `POST /api/komponen/set` (total bobot harus 100), `PUT/DELETE /api/komponen/[id]`
- `POST /api/nilai/bulk` — input bulk (upsert); `GET /api/nilai/rekap`
- `GET/POST /api/validasi`, `POST /api/validasi/unlock` (admin)
- `GET/POST /api/impor` — template & impor CSV
- `GET/POST /api/print-jobs`, `GET /api/print-jobs/[id]`, `GET /api/print-jobs/[id]/unduh?file=`
- `POST /api/worker/print` — worker antrean cetak (dipicu cron/penjadwal eksternal)

## Aturan bisnis penting

- Nilai akhir = Σ(nilai × bobot) / 100. Predikat: A 90–100, B 80–89, C 70–79, D < 70
  (dikonfigurasi di `lib/rapor.ts`), deskripsi capaian otomatis, flag remedial jika < KKM.
- Total bobot komponen per mapel harus tepat 100 (400 jika tidak).
- Nilai yang sudah divalidasi (locked) tidak bisa diubah (409); hanya admin yang bisa membuka kunci.
- PDF rapor disimpan di `storage/rapor/<jobId>/` (di-gitignore).

Lihat `PRD.md` untuk spesifikasi lengkap.
