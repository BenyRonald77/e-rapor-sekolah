import { NextRequest } from "next/server";
import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { err, asInt } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = asInt(params.id);
  if (id === null) return err("id tidak valid");
  const job = await prisma.printJob.findUnique({
    where: { id },
    include: { kelas: { select: { id: true, name: true } } },
  });
  if (!job) return err("print job tidak ditemukan", 404);
  const dir = join(process.cwd(), "storage", "rapor", String(id));
  const files: { name: string; size: number; url: string }[] = [];
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).sort()) {
      if (!name.endsWith(".pdf")) continue;
      const st = statSync(join(dir, name));
      files.push({ name, size: st.size, url: `/api/print-jobs/${id}/unduh?file=${encodeURIComponent(name)}` });
    }
  }
  return Response.json({ ...job, files, jumlahFile: files.length });
}
