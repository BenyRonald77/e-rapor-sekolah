import { prisma } from "./prisma";

export function validBobot(b: unknown): b is number {
  const n = Number(b);
  return Number.isInteger(n) && n > 0 && n <= 100;
}

export async function totalBobot(mapelId: number, kecualiId?: number): Promise<number> {
  const ks = await prisma.komponen.findMany({ where: { mapelId } });
  return ks.filter((k) => k.id !== kecualiId).reduce((s, k) => s + k.bobot, 0);
}
