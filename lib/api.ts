import { NextResponse } from "next/server";

export const err = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export const ok = (data: unknown, status = 200) =>
  NextResponse.json(data, { status });

export const created = (data: unknown) => NextResponse.json(data, { status: 201 });

export function asInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

/** Cek apakah kelas+semester+tahunAjaran terkunci. Return record validasi jika locked. */
export async function cekLock(
  prisma: import("@prisma/client").PrismaClient,
  kelasId: number,
  semester: string,
  tahunAjaran: string
) {
  return prisma.validasi.findFirst({
    where: { kelasId, semester, tahunAjaran, isLocked: true },
  });
}
