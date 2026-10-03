import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, asInt } from "@/lib/api";

/** Buka kunci oleh admin. Body: {kelasId, semester, tahunAjaran, adminUserId} */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { kelasId, semester, tahunAjaran, adminUserId } = body ?? {};
  const kId = asInt(kelasId);
  if (kId === null) return err("kelasId tidak valid");
  if (!semester || !tahunAjaran) return err("semester dan tahunAjaran wajib diisi");
  const aId = asInt(adminUserId);
  if (aId === null) return err("adminUserId wajib diisi");
  const admin = await prisma.user.findUnique({ where: { id: aId } });
  if (!admin) return err("user admin tidak ditemukan", 404);
  if (admin.role !== "admin") return err("hanya admin yang boleh membuka kunci", 403);

  const v = await prisma.validasi.findUnique({
    where: { kelasId_semester_tahunAjaran: { kelasId: kId, semester, tahunAjaran } },
    include: { kelas: { select: { name: true } } },
  });
  if (!v) return err("data validasi tidak ditemukan", 404);
  const updated = await prisma.validasi.update({
    where: { id: v.id },
    data: { isLocked: false },
  });
  return Response.json({
    ...updated,
    pesan: `Kunci nilai kelas ${v.kelas.name} semester ${semester} ${tahunAjaran} dibuka oleh admin ${admin.name}`,
    dibukaOleh: { id: admin.id, name: admin.name },
  });
}
