import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, asInt } from "@/lib/api";
import { totalBobot, validBobot } from "@/lib/komponen";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = asInt(params.id);
  if (id === null) return err("id tidak valid");
  const row = await prisma.komponen.findUnique({ where: { id } });
  if (!row) return err("komponen tidak ditemukan", 404);
  const body = await req.json().catch(() => null);
  const { name, bobot } = body ?? {};
  const data: { name?: string; bobot?: number } = {};
  if (name !== undefined) {
    if (!name || typeof name !== "string" || !name.trim()) return err("name tidak valid");
    const dupe = await prisma.komponen.findUnique({
      where: { mapelId_name: { mapelId: row.mapelId, name: name.trim() } },
    });
    if (dupe && dupe.id !== id) return err("nama komponen sudah ada untuk mapel ini", 409);
    data.name = name.trim();
  }
  if (bobot !== undefined) {
    if (!validBobot(bobot)) return err("bobot harus bilangan bulat 1-100");
    const total = (await totalBobot(row.mapelId, id)) + Number(bobot);
    if (total > 100) return err(`total bobot melebihi 100 (menjadi ${total})`, 400);
    data.bobot = Number(bobot);
  }
  const updated = await prisma.komponen.update({ where: { id }, data });
  return Response.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = asInt(params.id);
  if (id === null) return err("id tidak valid");
  const row = await prisma.komponen.findUnique({
    where: { id },
    include: { _count: { select: { nilai: true } } },
  });
  if (!row) return err("komponen tidak ditemukan", 404);
  if (row._count.nilai > 0) return err("komponen sudah punya nilai, tidak bisa dihapus", 409);
  await prisma.komponen.delete({ where: { id } });
  return Response.json({ ok: true });
}
