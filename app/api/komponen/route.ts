import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, created, asInt } from "@/lib/api";
import { validBobot, totalBobot } from "@/lib/komponen";

export async function GET(req: NextRequest) {
  const mapelId = req.nextUrl.searchParams.get("mapelId");
  const where = mapelId ? { mapelId: asInt(mapelId) ?? -1 } : {};
  const rows = await prisma.komponen.findMany({ where, orderBy: { id: "asc" } });
  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { mapelId, name, bobot } = body ?? {};
  const mId = asInt(mapelId);
  if (mId === null) return err("mapelId tidak valid");
  if (!(await prisma.mapel.findUnique({ where: { id: mId } })))
    return err("mapel tidak ditemukan", 404);
  if (!name || typeof name !== "string" || !name.trim()) return err("name wajib diisi");
  if (!validBobot(bobot)) return err("bobot harus bilangan bulat 1-100");
  const dupe = await prisma.komponen.findUnique({
    where: { mapelId_name: { mapelId: mId, name: name.trim() } },
  });
  if (dupe) return err("nama komponen sudah ada untuk mapel ini", 409);
  const total = (await totalBobot(mId)) + Number(bobot);
  if (total > 100)
    return err(`total bobot melebihi 100 (menjadi ${total})`, 400);
  const k = await prisma.komponen.create({
    data: { mapelId: mId, name: name.trim(), bobot: Number(bobot) },
  });
  return created(k);
}
