import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, created, asInt } from "@/lib/api";

export async function GET() {
  const rows = await prisma.kelas.findMany({
    orderBy: { id: "asc" },
    include: {
      waliKelas: { select: { id: true, name: true, email: true } },
      _count: { select: { siswa: true } },
    },
  });
  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { name, waliKelasId } = body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) return err("name wajib diisi");
  if (await prisma.kelas.findUnique({ where: { name: name.trim() } }))
    return err("nama kelas sudah ada", 409);
  let waliId: number | null = null;
  if (waliKelasId !== undefined && waliKelasId !== null && waliKelasId !== "") {
    waliId = asInt(waliKelasId);
    if (waliId === null) return err("waliKelasId tidak valid");
    if (!(await prisma.user.findUnique({ where: { id: waliId } })))
      return err("user wali kelas tidak ditemukan", 404);
  }
  const kelas = await prisma.kelas.create({ data: { name: name.trim(), waliKelasId: waliId } });
  return created(kelas);
}
