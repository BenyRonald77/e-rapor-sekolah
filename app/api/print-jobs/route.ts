import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, created, asInt } from "@/lib/api";

export async function GET() {
  const rows = await prisma.printJob.findMany({
    orderBy: { id: "desc" },
    include: {
      kelas: { select: { id: true, name: true, _count: { select: { siswa: true } } } },
    },
  });
  return Response.json(rows);
}

/** Buat print job baru (status queued). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { kelasId, semester, tahunAjaran } = body ?? {};
  const kId = asInt(kelasId);
  if (kId === null) return err("kelasId tidak valid");
  if (!semester || !tahunAjaran) return err("semester dan tahunAjaran wajib diisi");
  if (!(await prisma.kelas.findUnique({ where: { id: kId } })))
    return err("kelas tidak ditemukan", 404);
  const dupe = await prisma.printJob.findFirst({
    where: { kelasId: kId, semester, tahunAjaran, status: { in: ["queued", "processing"] } },
  });
  if (dupe) return err("sudah ada antrean cetak aktif untuk kelas+semester ini", 409);
  const job = await prisma.printJob.create({
    data: { kelasId: kId, semester, tahunAjaran, status: "queued" },
  });
  return created(job);
}
