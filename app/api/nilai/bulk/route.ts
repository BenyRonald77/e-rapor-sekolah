import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, asInt, cekLock } from "@/lib/api";

/**
 * Input nilai bulk (upsert) per (kelas, mapel).
 * Body: { semester, tahunAjaran, entries: [{siswaId, komponenId, nilai}] }
 * Jika kelas+semester terkunci -> 409.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { semester, tahunAjaran, entries } = body ?? {};
  if (!semester || !tahunAjaran) return err("semester dan tahunAjaran wajib diisi");
  if (!Array.isArray(entries) || entries.length === 0)
    return err("entries harus array tidak kosong");

  // Validasi & kumpulkan data dulu (tanpa menulis)
  const siswaCache = new Map<number, { id: number; kelasId: number; nis: string; name: string }>();
  const kompCache = new Map<number, { id: number; mapelId: number; name: string; bobot: number }>();
  const siap: { siswaId: number; kelasId: number; komponenId: number; nilai: number }[] = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const tag = `entries[${i}]`;
    const siswaId = asInt(e?.siswaId);
    const komponenId = asInt(e?.komponenId);
    const nilaiN = Number(e?.nilai);
    if (siswaId === null) return err(`${tag}: siswaId tidak valid`);
    if (komponenId === null) return err(`${tag}: komponenId tidak valid`);
    if (!Number.isInteger(nilaiN) || nilaiN < 0 || nilaiN > 100)
      return err(`${tag}: nilai harus bilangan bulat 0-100`);

    if (!siswaCache.has(siswaId)) {
      const s = await prisma.siswa.findUnique({ where: { id: siswaId } });
      if (!s) return err(`${tag}: siswa tidak ditemukan`);
      siswaCache.set(siswaId, s);
    }
    if (!kompCache.has(komponenId)) {
      const k = await prisma.komponen.findUnique({ where: { id: komponenId } });
      if (!k) return err(`${tag}: komponen tidak ditemukan`);
      kompCache.set(komponenId, k);
    }
    siap.push({ siswaId, kelasId: siswaCache.get(siswaId)!.kelasId, komponenId, nilai: nilaiN });
  }

  // Hormati lock per kelas
  const kelasIds = [...new Set(siap.map((s) => s.kelasId))];
  for (const kId of kelasIds) {
    const locked = await cekLock(prisma, kId, String(semester), String(tahunAjaran));
    if (locked) return err("nilai terkunci: validasi sudah dilakukan wali kelas", 409);
  }

  let disimpan = 0;
  for (const s of siap) {
    await prisma.nilai.upsert({
      where: { siswaId_komponenId: { siswaId: s.siswaId, komponenId: s.komponenId } },
      update: { nilai: s.nilai },
      create: { siswaId: s.siswaId, komponenId: s.komponenId, nilai: s.nilai },
    });
    disimpan++;
  }
  return Response.json({ disimpan });
}
