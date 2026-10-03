import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, asInt } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = asInt(params.id);
  if (id === null) return err("id tidak valid");
  const row = await prisma.kelas.findUnique({
    where: { id },
    include: { waliKelas: { select: { id: true, name: true } } },
  });
  if (!row) return err("kelas tidak ditemukan", 404);
  return Response.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = asInt(params.id);
  if (id === null) return err("id tidak valid");
  const body = await req.json().catch(() => null);
  const { name, waliKelasId } = body ?? {};
  const row = await prisma.kelas.findUnique({ where: { id } });
  if (!row) return err("kelas tidak ditemukan", 404);
  const data: { name?: string; waliKelasId?: number | null } = {};
  if (name !== undefined) {
    if (!name || typeof name !== "string" || !name.trim()) return err("name tidak valid");
    const dupe = await prisma.kelas.findUnique({ where: { name: name.trim() } });
    if (dupe && dupe.id !== id) return err("nama kelas sudah ada", 409);
    data.name = name.trim();
  }
  if (waliKelasId !== undefined) {
    if (waliKelasId === null || waliKelasId === "") {
      data.waliKelasId = null;
    } else {
      const waliId = asInt(waliKelasId);
      if (waliId === null) return err("waliKelasId tidak valid");
      if (!(await prisma.user.findUnique({ where: { id: waliId } })))
        return err("user wali kelas tidak ditemukan", 404);
      data.waliKelasId = waliId;
    }
  }
  const updated = await prisma.kelas.update({ where: { id }, data });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = asInt(params.id);
  if (id === null) return err("id tidak valid");
  const row = await prisma.kelas.findUnique({
    where: { id },
    include: { _count: { select: { siswa: true, validasi: true, printJobs: true } } },
  });
  if (!row) return err("kelas tidak ditemukan", 404);
  if (row._count.siswa > 0 || row._count.validasi > 0 || row._count.printJobs > 0)
    return err("kelas masih dipakai (siswa/validasi/print job)", 409);
  await prisma.kelas.delete({ where: { id } });
  return Response.json({ ok: true });
}
