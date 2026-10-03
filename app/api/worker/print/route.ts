import { NextRequest } from "next/server";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { rekapSiswa } from "@/lib/rekap";
import {
  generateRaporPdf,
  tanggalIndonesia,
  slugNama,
} from "@/lib/pdf";
import { NAMA_SEKOLAH, ALAMAT_SEKOLAH } from "@/lib/rapor";

/**
 * Worker antrean cetak. Dipicu penjadwal eksternal (cron) atau manual.
 * Memproses semua job "queued" secara FIFO, generate PDF per siswa.
 */
export async function POST(_req: NextRequest) {
  const jobs = await prisma.printJob.findMany({
    where: { status: "queued" },
    orderBy: { id: "asc" },
  });
  const results: { jobId: number; status: string; files?: number; error?: string }[] = [];

  for (const job of jobs) {
    await prisma.printJob.update({
      where: { id: job.id },
      data: { status: "processing", log: "diproses worker" },
    });
    try {
      const kelas = await prisma.kelas.findUnique({
        where: { id: job.kelasId },
        include: {
          waliKelas: { select: { name: true } },
          siswa: { orderBy: { nis: "asc" } },
        },
      });
      if (!kelas) throw new Error("kelas tidak ditemukan");
      if (kelas.siswa.length === 0) throw new Error("kelas tidak punya siswa");

      const dir = join(process.cwd(), "storage", "rapor", String(job.id));
      mkdirSync(dir, { recursive: true });
      const logs: string[] = [];
      let files = 0;
      for (const s of kelas.siswa) {
        const rekap = await rekapSiswa(prisma, s.id);
        if (!rekap) throw new Error(`rekap siswa ${s.nis} gagal`);
        const pdf = await generateRaporPdf({
          namaSekolah: NAMA_SEKOLAH,
          alamatSekolah: ALAMAT_SEKOLAH,
          semester: job.semester,
          tahunAjaran: job.tahunAjaran,
          siswa: { nis: s.nis, name: s.name, kelasName: kelas.name },
          mapel: rekap.mapel.map((m) => ({
            name: m.mapel.name,
            kkm: m.mapel.kkm,
            nilaiAkhir: m.nilaiAkhir,
            predikat: m.predikat,
            deskripsi: m.deskripsi,
            remedial: m.remedial,
          })),
          rataRata: rekap.rataRata,
          waliKelasName: kelas.waliKelas?.name ?? "-",
          tanggal: tanggalIndonesia(),
        });
        const fname = `${s.nis}-${slugNama(s.name)}.pdf`;
        writeFileSync(join(dir, fname), pdf);
        files++;
        logs.push(`${s.nis} ok`);
      }
      await prisma.printJob.update({
        where: { id: job.id },
        data: {
          status: "done",
          resultPath: `storage/rapor/${job.id}`,
          log: `${files} PDF dibuat: ${logs.join("; ")}`,
        },
      });
      results.push({ jobId: job.id, status: "done", files });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await prisma.printJob.update({
        where: { id: job.id },
        data: { status: "failed", log: msg },
      });
      results.push({ jobId: job.id, status: "failed", error: msg });
    }
  }

  return Response.json({ diproses: results.length, results });
}
