import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, created, asInt } from "@/lib/api";

export async function GET(req: NextRequest) {
  const kelasId = req.nextUrl.searchParams.get("kelasId");
  const where = kelasId ? { kelasId: asInt(kelasId) ?? -1 } : {};
  const rows = await prisma.mapel.findMany({
    where,
    orderBy: { id: "asc" },
    include: {
      kelas: { select: { id: true, name: true } },
      komponen: { orderBy: { id: "asc" } },
    },
  });
  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { name, kkm, kelasId } = body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) return err("name wajib diisi");
  const kkmN = Number(kkm);
  if (!Number.isInteger(kkmN) || kkmN < 0 || kkmN > 100)
    return err("kkm harus bilangan bulat 0-100");
  let kId: number | null = null;
  if (kelasId !== undefined && kelasId !== null && kelasId !== "") {
    kId = asInt(kelasId);
    if (kId === null) return err("kelasId tidak valid");
    if (!(await prisma.kelas.findUnique({ where: { id: kId } })))
      return err("kelas tidak ditemukan", 404);
  }
  const mapel = await prisma.mapel.create({
    data: { name: name.trim(), kkm: kkmN, kelasId: kId },
  });
  return created(mapel);
}
