import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, asInt } from "@/lib/api";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const where: { kelasId?: number; semester?: string; tahunAjaran?: string } = {};
  const kId = sp.get("kelasId");
  if (kId) {
    const n = asInt(kId);
    if (n === null) return err("kelasId tidak valid");
    where.kelasId = n;
  }
  const sem = sp.get("semester");
  const ta = sp.get("tahunAjaran");
  if (sem) where.semester = sem;
  if (ta) where.tahunAjaran = ta;
  const rows = await prisma.validasi.findMany({
    where,
    orderBy: [{ kelasId: "asc" }, { tahunAjaran: "desc" }, { semester: "asc" }],
    include: {
      kelas: { select: { id: true, name: true } },
      validator: { select: { id: true, name: true } },
    },
  });
  return Response.json(rows);
}

/** Kunci (lock) nilai kelas+semester oleh wali kelas. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { kelasId, semester, tahunAjaran, validatedBy } = body ?? {};
  const kId = asInt(kelasId);
  if (kId === null) return err("kelasId tidak valid");
  if (!semester || !tahunAjaran) return err("semester dan tahunAjaran wajib diisi");
  if (!(await prisma.kelas.findUnique({ where: { id: kId } })))
    return err("kelas tidak ditemukan", 404);

  let validatorId: number | null = null;
  if (validatedBy !== undefined && validatedBy !== null && validatedBy !== "") {
    validatorId = asInt(validatedBy);
    if (validatorId === null) return err("validatedBy tidak valid");
    if (!(await prisma.user.findUnique({ where: { id: validatorId } })))
      return err("user validator tidak ditemukan", 404);
  }

  const v = await prisma.validasi.upsert({
    where: { kelasId_semester_tahunAjaran: { kelasId: kId, semester, tahunAjaran } },
    update: { isLocked: true, validatedBy: validatorId, validatedAt: new Date() },
    create: {
      kelasId: kId,
      semester,
      tahunAjaran,
      isLocked: true,
      validatedBy: validatorId,
      validatedAt: new Date(),
    },
    include: { kelas: { select: { id: true, name: true } } },
  });
  return Response.json({ ...v, pesan: `Nilai kelas ${v.kelas.name} semester ${semester} ${tahunAjaran} dikunci` });
}
