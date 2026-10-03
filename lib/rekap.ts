import { PrismaClient } from "@prisma/client";
import { predikat, deskripsiCapaian, nilaiAkhir, isRemedial } from "./rapor";

type P = PrismaClient;

/** Rekap nilai satu siswa untuk semua mapel yang berlaku. Dipakai API rekap & worker cetak. */
export async function rekapSiswa(prisma: P, siswaId: number) {
  const siswa = await prisma.siswa.findUnique({
    where: { id: siswaId },
    include: { kelas: { include: { waliKelas: { select: { name: true } } } } },
  });
  if (!siswa) return null;
  const mapels = await prisma.mapel.findMany({
    where: { OR: [{ kelasId: null }, { kelasId: siswa.kelasId }] },
    orderBy: { id: "asc" },
    include: { komponen: { orderBy: { id: "asc" } } },
  });
  const semuaNilai = await prisma.nilai.findMany({
    where: { siswaId },
    select: { komponenId: true, nilai: true },
  });
  const nilaiMap = new Map(semuaNilai.map((n) => [n.komponenId, n.nilai]));
  const hasil = mapels.map((m) => {
    const items = m.komponen.map((k) => ({
      komponenId: k.id,
      name: k.name,
      bobot: k.bobot,
      nilai: nilaiMap.has(k.id) ? nilaiMap.get(k.id)! : null,
    }));
    const akhir = nilaiAkhir(items.map((i) => ({ nilai: i.nilai, bobot: i.bobot })));
    const p = akhir === null ? null : predikat(akhir);
    return {
      mapel: { id: m.id, name: m.name, kkm: m.kkm },
      komponen: items,
      nilaiAkhir: akhir,
      predikat: p,
      deskripsi: p === null ? null : deskripsiCapaian(p, m.name),
      remedial: isRemedial(akhir, m.kkm),
      lengkap: akhir !== null,
    };
  });
  const valid = hasil.map((h) => h.nilaiAkhir).filter((n): n is number => n !== null);
  const rataRata =
    valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : null;
  return { siswa, mapel: hasil, rataRata };
}
