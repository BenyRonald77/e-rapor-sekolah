import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, asInt } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = asInt(params.id);
  if (id === null) return err("id tidak valid");
  const row = await prisma.mapel.findUnique({
    where: { id },
    include: { komponen: { orderBy: { id: "asc" } } },
  });
  if (!row) return err("mapel tidak ditemukan", 404);
  return Response.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = asInt(params.id);
  if (id === null) return err("id tidak valid");
  const row = await prisma.mapel.findUnique({ where: { id } });
  if (!row) return err("mapel tidak ditemukan", 404);
  const body = await req.json().catch(() => null);
  const { name, kkm, kelasId } = body ?? {};
  const data: { name?: string; kkm?: number; kelasId?: number | null } = {};
  if (name !== undefined) {
    if (!name || typeof name !== "string" || !name.trim()) return err("name tidak valid");
    data.name = name.trim();
  }
  if (kkm !== undefined) {
    const kkmN = Number(kkm);
    if (!Number.isInteger(kkmN) || kkmN < 0 || kkmN > 100)
      return err("kkm harus bilangan bulat 0-100");
    data.kkm = kkmN;
  }
  if (kelasId !== undefined) {
    if (kelasId === null || kelasId === "") {
      data.kelasId = null;
    } else {
      const kId = asInt(kelasId);
      if (kId === null) return err("kelasId tidak valid");
      if (!(await prisma.kelas.findUnique({ where: { id: kId } })))
        return err("kelas tidak ditemukan", 404);
      data.kelasId = kId;
    }
  }
  const updated = await prisma.mapel.update({ where: { id }, data });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = asInt(params.id);
  if (id === null) return err("id tidak valid");
  const row = await prisma.mapel.findUnique({
    where: { id },
    include: { _count: { select: { komponen: true } } },
  });
  if (!row) return err("mapel tidak ditemukan", 404);
  if (row._count.komponen > 0) return err("mapel masih punya komponen penilaian", 409);
  await prisma.mapel.delete({ where: { id } });
  return Response.json({ ok: true });
}
