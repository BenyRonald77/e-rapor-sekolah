// Logika domain rapor: predikat, deskripsi capaian, nilai akhir, remedial.
// Semua rentang & teks deskripsi dikonfigurasi di sini.

export const NAMA_SEKOLAH = "SMP Nusantara";
export const ALAMAT_SEKOLAH = "Jl. Pendidikan No. 1, Jakarta";

export type Predikat = "A" | "B" | "C" | "D";

export const BATAS_PREDIKAT: { min: number; predikat: Predikat }[] = [
  { min: 90, predikat: "A" },
  { min: 80, predikat: "B" },
  { min: 70, predikat: "C" },
  { min: 0, predikat: "D" },
];

export function predikat(nilaiAkhir: number): Predikat {
  for (const b of BATAS_PREDIKAT) {
    if (nilaiAkhir >= b.min) return b.predikat;
  }
  return "D";
}

const TEMPLATE_DESKRIPSI: Record<Predikat, string> = {
  A: "Sangat baik dalam {mapel}, pertahankan prestasimu!",
  B: "Baik dalam {mapel}, tingkatkan lagi agar lebih optimal.",
  C: "Cukup dalam {mapel}, perlu peningkatan dalam belajar.",
  D: "Kurang dalam {mapel}, perlu bimbingan dan mengikuti remedial.",
};

export function deskripsiCapaian(p: Predikat, namaMapel: string): string {
  return TEMPLATE_DESKRIPSI[p].replace("{mapel}", namaMapel);
}

/** Nilai akhir = Σ(nilai × bobot) / 100. Null jika ada komponen yang belum dinilai. */
export function nilaiAkhir(items: { nilai: number | null; bobot: number }[]): number | null {
  if (items.length === 0) return null;
  let total = 0;
  for (const it of items) {
    if (it.nilai === null || it.nilai === undefined) return null;
    total += it.nilai * it.bobot;
  }
  return Math.round((total / 100) * 10) / 10;
}

export function isRemedial(nilaiAkhirVal: number | null, kkm: number): boolean {
  if (nilaiAkhirVal === null) return false;
  return nilaiAkhirVal < kkm;
}

export const SEMESTER_VALID = ["Ganjil", "Genap"] as const;
export const TAHUN_AJARAN_DEFAULT = "2026/2027";
