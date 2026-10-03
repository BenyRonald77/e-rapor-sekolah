import { NextRequest } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { err, asInt } from "@/lib/api";

/** Unduh satu PDF hasil cetak: GET /api/print-jobs/[id]/unduh?file=<nama>.pdf */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = asInt(params.id);
  if (id === null) return err("id tidak valid");
  const job = await prisma.printJob.findUnique({ where: { id } });
  if (!job) return err("print job tidak ditemukan", 404);
  const file = req.nextUrl.searchParams.get("file") ?? "";
  if (!/^[A-Za-z0-9_.-]+\.pdf$/.test(file)) return err("nama file tidak valid");
  const full = join(process.cwd(), "storage", "rapor", String(id), file);
  if (!existsSync(full)) return err("file tidak ditemukan", 404);
  const buf = readFileSync(full);
  return new Response(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Content-Length": String(buf.length),
    },
  });
}
