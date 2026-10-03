import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, created, asInt } from "@/lib/api";

export async function GET(req: NextRequest) {
  const kelasId = req.nextUrl.searchParams.get("kelasId");
  const where = kelasId ? { kelasId: asInt(kelasId) ?? -1 } : {};
  const rows = await prisma.siswa.findMany({
    where,
    orderBy: { nis: "asc" },
    include: { kelas: { select: { id: true, name: true } } },
  });
  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { nis, name, kelasId } = body ?? {};
  if (!nis || !name) return err("nis dan name wajib diisi");
  const kId = asInt(kelasId);
  if (kId === null) return err("kelasId tidak valid");
  if (!(await prisma.kelas.findUnique({ where: { id: kId } })))
    return err("kelas tidak ditemukan", 404);
  if (await prisma.siswa.findUnique({ where: { nis: String(nis).trim() } }))
    return err("NIS sudah dipakai", 409);
  const siswa = await prisma.siswa.create({
    data: { nis: String(nis).trim(), name: String(name).trim(), kelasId: kId },
  });
  return created(siswa);
}
