import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, asInt } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = asInt(params.id);
  if (id === null) return err("id tidak valid");
  const row = await prisma.siswa.findUnique({
    where: { id },
    include: { kelas: { select: { id: true, name: true } } },
  });
  if (!row) return err("siswa tidak ditemukan", 404);
  return Response.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = asInt(params.id);
  if (id === null) return err("id tidak valid");
  const row = await prisma.siswa.findUnique({ where: { id } });
  if (!row) return err("siswa tidak ditemukan", 404);
  const body = await req.json().catch(() => null);
  const { nis, name, kelasId } = body ?? {};
  const data: { nis?: string; name?: string; kelasId?: number } = {};
  if (nis !== undefined) {
    const dupe = await prisma.siswa.findUnique({ where: { nis: String(nis).trim() } });
    if (dupe && dupe.id !== id) return err("NIS sudah dipakai", 409);
    data.nis = String(nis).trim();
  }
  if (name !== undefined) data.name = String(name).trim();
  if (kelasId !== undefined) {
    const kId = asInt(kelasId);
    if (kId === null) return err("kelasId tidak valid");
    if (!(await prisma.kelas.findUnique({ where: { id: kId } })))
      return err("kelas tidak ditemukan", 404);
    data.kelasId = kId;
  }
  const updated = await prisma.siswa.update({ where: { id }, data });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = asInt(params.id);
  if (id === null) return err("id tidak valid");
  const row = await prisma.siswa.findUnique({
    where: { id },
    include: { _count: { select: { nilai: true } } },
  });
  if (!row) return err("siswa tidak ditemukan", 404);
  if (row._count.nilai > 0) return err("siswa masih punya nilai", 409);
  await prisma.siswa.delete({ where: { id } });
  return Response.json({ ok: true });
}
