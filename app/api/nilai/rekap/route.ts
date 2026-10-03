import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, asInt } from "@/lib/api";
import { predikat, deskripsiCapaian, nilaiAkhir, isRemedial } from "@/lib/rapor";

type NilaiRow = { komponenId: number; nilai: number };

function rekapSatuMapel(
  namaMapel: string,
  kkm: number,
  komponen: { id: number; name: string; bobot: number }[],
  nilaiMap: Map<number, number>
) {
  const items = komponen.map((k) => ({
    komponenId: k.id,
    name: k.name,
    bobot: k.bobot,
    nilai: nilaiMap.has(k.id) ? nilaiMap.get(k.id)! : null,
  }));
  const akhir = nilaiAkhir(items.map((i) => ({ nilai: i.nilai, bobot: i.bobot })));
  const p = akhir === null ? null : predikat(akhir);
  return {
    komponen: items,
    nilaiAkhir: akhir,
    predikat: p,
    deskripsi: p === null ? null : deskripsiCapaian(p, namaMapel),
    remedial: isRemedial(akhir, kkm),
    lengkap: akhir !== null,
  };
}

/**
 * GET /api/nilai/rekap?kelasId=&mapelId=  -> rekap satu mapel untuk semua siswa kelas
 * GET /api/nilai/rekap?siswaId=          -> rekap semua mapel untuk satu siswa
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kelasId = sp.get("kelasId");
  const mapelId = sp.get("mapelId");
  const siswaId = sp.get("siswaId");

  if (siswaId) {
    const sId = asInt(siswaId);
    if (sId === null) return err("siswaId tidak valid");
    const siswa = await prisma.siswa.findUnique({
      where: { id: sId },
      include: { kelas: true },
    });
    if (!siswa) return err("siswa tidak ditemukan", 404);
    const mapels = await prisma.mapel.findMany({
      where: { OR: [{ kelasId: null }, { kelasId: siswa.kelasId }] },
      orderBy: { id: "asc" },
      include: { komponen: { orderBy: { id: "asc" } } },
    });
    const semuaNilai: NilaiRow[] = await prisma.nilai.findMany({
      where: { siswaId: sId },
      select: { komponenId: true, nilai: true },
    });
    const nilaiMap = new Map(semuaNilai.map((n) => [n.komponenId, n.nilai]));
    const hasil = mapels.map((m) => ({
      mapel: { id: m.id, name: m.name, kkm: m.kkm },
      ...rekapSatuMapel(m.name, m.kkm, m.komponen, nilaiMap),
    }));
    const valid = hasil.map((h) => h.nilaiAkhir).filter((n): n is number => n !== null);
    const rataRata =
      valid.length > 0 ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : null;
    return Response.json({ siswa, mapel: hasil, rataRata });
  }

  const kId = asInt(kelasId ?? "");
  const mId = asInt(mapelId ?? "");
  if (kId === null || mId === null) return err("kelasId dan mapelId wajib diisi");
  const kelas = await prisma.kelas.findUnique({ where: { id: kId } });
  if (!kelas) return err("kelas tidak ditemukan", 404);
  const mapel = await prisma.mapel.findUnique({
    where: { id: mId },
    include: { komponen: { orderBy: { id: "asc" } } },
  });
  if (!mapel) return err("mapel tidak ditemukan", 404);

  const siswaList = await prisma.siswa.findMany({
    where: { kelasId: kId },
    orderBy: { nis: "asc" },
  });
  const kompIds = mapel.komponen.map((k) => k.id);
  const semuaNilai: (NilaiRow & { siswaId: number })[] =
    kompIds.length > 0
      ? await prisma.nilai.findMany({
          where: { komponenId: { in: kompIds }, siswaId: { in: siswaList.map((s) => s.id) } },
          select: { siswaId: true, komponenId: true, nilai: true },
        })
      : [];
  const rows = siswaList.map((s) => {
    const nilaiMap = new Map(
      semuaNilai.filter((n) => n.siswaId === s.id).map((n) => [n.komponenId, n.nilai])
    );
    return {
      siswa: { id: s.id, nis: s.nis, name: s.name },
      ...rekapSatuMapel(mapel.name, mapel.kkm, mapel.komponen, nilaiMap),
    };
  });
  const totalBobot = mapel.komponen.reduce((a, k) => a + k.bobot, 0);
  return Response.json({
    kelas: { id: kelas.id, name: kelas.name },
    mapel: { id: mapel.id, name: mapel.name, kkm: mapel.kkm },
    totalBobot,
    bobotValid: totalBobot === 100,
    rows,
  });
}
