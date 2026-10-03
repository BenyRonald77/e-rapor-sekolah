import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { err, asInt, cekLock } from "@/lib/api";

/** Unduh template CSV. ?mapelId= untuk mengisi contoh nama komponen. */
export async function GET(req: NextRequest) {
  const mapelId = req.nextUrl.searchParams.get("mapelId");
  let contoh = "Tugas";
  if (mapelId) {
    const mId = asInt(mapelId);
    if (mId !== null) {
      const k = await prisma.komponen.findFirst({ where: { mapelId: mId }, orderBy: { id: "asc" } });
      if (k) contoh = k.name;
    }
  }
  const csv = `nis,komponen,nilai\n1001,${contoh},80\n1002,${contoh},75\n`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template-nilai.csv"',
    },
  });
}

function parseCsv(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.split(",").map((c) => c.trim()));
}

/**
 * Impor nilai dari CSV (multipart: file, mapelId, semester, tahunAjaran).
 * Baris gagal dilaporkan; baris valid tetap masuk. Hormati lock -> 409.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return err("form-data tidak valid");
  const file = form.get("file");
  const mId = asInt(form.get("mapelId"));
  const semester = String(form.get("semester") ?? "");
  const tahunAjaran = String(form.get("tahunAjaran") ?? "");
  if (!(file instanceof File)) return err("file CSV wajib diunggah");
  if (mId === null) return err("mapelId tidak valid");
  if (!semester || !tahunAjaran) return err("semester dan tahunAjaran wajib diisi");
  const mapel = await prisma.mapel.findUnique({
    where: { id: mId },
    include: { komponen: true },
  });
  if (!mapel) return err("mapel tidak ditemukan", 404);

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) return err("file CSV kosong (butuh header + minimal 1 baris data)");
  const header = rows[0].map((h) => h.toLowerCase());
  if (header[0] !== "nis" || header[1] !== "komponen" || header[2] !== "nilai")
    return err("header CSV harus: nis,komponen,nilai");

  const kompByName = new Map(mapel.komponen.map((k) => [k.name.toLowerCase(), k]));
  const gagal: { baris: number; alasan: string }[] = [];
  const valid: { siswaId: number; kelasId: number; komponenId: number; nilai: number }[] = [];
  const siswaCache = new Map<string, { id: number; kelasId: number } | null>();

  for (let i = 1; i < rows.length; i++) {
    const noBaris = i + 1;
    const [nis, namaKomp, nilaiStr] = rows[i];
    if (!nis) { gagal.push({ baris: noBaris, alasan: "NIS kosong" }); continue; }
    if (!siswaCache.has(nis)) {
      const s = await prisma.siswa.findUnique({ where: { nis } });
      siswaCache.set(nis, s ? { id: s.id, kelasId: s.kelasId } : null);
    }
    const s = siswaCache.get(nis)!;
    if (!s) { gagal.push({ baris: noBaris, alasan: `NIS ${nis} tidak ditemukan` }); continue; }
    const komp = kompByName.get((namaKomp ?? "").toLowerCase());
    if (!komp) { gagal.push({ baris: noBaris, alasan: `komponen "${namaKomp}" tidak ada di mapel ${mapel.name}` }); continue; }
    const nilaiN = Number(nilaiStr);
    if (!Number.isInteger(nilaiN) || nilaiN < 0 || nilaiN > 100) {
      gagal.push({ baris: noBaris, alasan: `nilai "${nilaiStr}" harus bilangan bulat 0-100` });
      continue;
    }
    valid.push({ siswaId: s.id, kelasId: s.kelasId, komponenId: komp.id, nilai: nilaiN });
  }

  // Hormati lock: cek sebelum ada yang ditulis
  const kelasIds = [...new Set(valid.map((v) => v.kelasId))];
  for (const kId of kelasIds) {
    const locked = await cekLock(prisma, kId, semester, tahunAjaran);
    if (locked) return err("impor ditolak: nilai terkunci (sudah divalidasi wali kelas)", 409);
  }

  let berhasil = 0;
  for (const v of valid) {
    await prisma.nilai.upsert({
      where: { siswaId_komponenId: { siswaId: v.siswaId, komponenId: v.komponenId } },
      update: { nilai: v.nilai },
      create: { siswaId: v.siswaId, komponenId: v.komponenId, nilai: v.nilai },
    });
    berhasil++;
  }
  return Response.json({ berhasil, gagal, total: rows.length - 1 });
}
