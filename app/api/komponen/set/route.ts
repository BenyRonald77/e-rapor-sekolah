import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, asInt } from "@/lib/api";
import { validBobot } from "@/lib/komponen";

/**
 * Simpan SET komponen satu mapel sekaligus.
 * Total bobot HARUS tepat 100 -> 400 jika tidak.
 * Komponen lama yang tidak ada di set baru akan dihapus (ditolak 409 jika sudah punya nilai).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { mapelId, items } = body ?? {};
  const mId = asInt(mapelId);
  if (mId === null) return err("mapelId tidak valid");
  if (!(await prisma.mapel.findUnique({ where: { id: mId } })))
    return err("mapel tidak ditemukan", 404);
  if (!Array.isArray(items) || items.length === 0)
    return err("items harus array tidak kosong: [{name, bobot}]");

  const names = new Set<string>();
  let total = 0;
  for (const it of items) {
    const nm = typeof it?.name === "string" ? it.name.trim() : "";
    if (!nm) return err("setiap komponen wajib punya name");
    if (names.has(nm.toLowerCase())) return err(`nama komponen duplikat: ${nm}`);
    names.add(nm.toLowerCase());
    if (!validBobot(it?.bobot)) return err(`bobot "${nm}" harus bilangan bulat 1-100`);
    total += Number(it.bobot);
  }
  if (total !== 100)
    return err(`total bobot harus tepat 100 (saat ini ${total})`, 400);

  const existing = await prisma.komponen.findMany({
    where: { mapelId: mId },
    include: { _count: { select: { nilai: true } } },
  });
  const keepNames = new Set(items.map((it: { name: string }) => it.name.trim().toLowerCase()));
  for (const e of existing) {
    if (!keepNames.has(e.name.toLowerCase()) && e._count.nilai > 0)
      return err(`komponen "${e.name}" tidak bisa dihapus karena sudah ada nilai`, 409);
  }

  // Terapkan perubahan
  for (const e of existing) {
    if (!keepNames.has(e.name.toLowerCase())) {
      await prisma.komponen.delete({ where: { id: e.id } });
    }
  }
  const hasil = [];
  for (const it of items) {
    const nm: string = it.name.trim();
    hasil.push(
      await prisma.komponen.upsert({
        where: { mapelId_name: { mapelId: mId, name: nm } },
        update: { bobot: Number(it.bobot) },
        create: { mapelId: mId, name: nm, bobot: Number(it.bobot) },
      })
    );
  }
  return Response.json({ totalBobot: total, komponen: hasil }, { status: 200 });
}
