import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();
const hash = (pw: string) => createHash("sha256").update(pw).digest("hex");

async function main() {
  if ((await prisma.user.count()) > 0) {
    console.log("seed dilewati (sudah ada data)");
    return;
  }

  const admin = await prisma.user.create({
    data: { name: "Admin Sekolah", email: "admin@sekolah.id", passwordHash: hash("admin123"), role: "admin" },
  });
  const wali = await prisma.user.create({
    data: { name: "Budi Santoso", email: "wali@sekolah.id", passwordHash: hash("wali123"), role: "walikelas" },
  });
  const kelas = await prisma.kelas.create({
    data: { name: "7A", waliKelasId: wali.id },
  });

  const siswaData = [
    { nis: "1001", name: "Andi Pratama" },
    { nis: "1002", name: "Siti Rahma" },
    { nis: "1003", name: "Dewi Lestari" },
    { nis: "1004", name: "Joko Hartono" },
    { nis: "1005", name: "Rina Marlina" },
  ];
  const siswa = [];
  for (const s of siswaData) {
    siswa.push(await prisma.siswa.create({ data: { ...s, kelasId: kelas.id } }));
  }

  const mtk = await prisma.mapel.create({ data: { name: "Matematika", kkm: 75 } });
  const ipa = await prisma.mapel.create({ data: { name: "IPA", kkm: 70 } });

  const komps: Record<string, number[]> = {};
  for (const m of [mtk, ipa]) {
    const defs = [
      { name: "Tugas", bobot: 30 },
      { name: "UTS", bobot: 30 },
      { name: "UAS", bobot: 40 },
    ];
    komps[m.name] = [];
    for (const d of defs) {
      const k = await prisma.komponen.create({ data: { mapelId: m.id, ...d } });
      komps[m.name].push(k.id);
    }
  }

  // Nilai lengkap untuk 2 siswa (1001 & 1002)
  const nilaiSeed: Record<string, Record<string, Record<string, number>>> = {
    "1001": {
      Matematika: { Tugas: 80, UTS: 70, UAS: 90 }, // akhir 81 (B)
      IPA: { Tugas: 85, UTS: 75, UAS: 80 }, // akhir 80 (B)
    },
    "1002": {
      Matematika: { Tugas: 60, UTS: 65, UAS: 70 }, // akhir 65.5 (D, remedial <75)
      IPA: { Tugas: 95, UTS: 90, UAS: 92 }, // akhir 92.3 (A)
    },
  };
  const siswaByNis = Object.fromEntries(siswa.map((s) => [s.nis, s]));
  const kompByMapelName: Record<string, Record<string, number>> = {};
  for (const m of [mtk, ipa]) {
    const ks = await prisma.komponen.findMany({ where: { mapelId: m.id } });
    kompByMapelName[m.name] = Object.fromEntries(ks.map((k) => [k.name, k.id]));
  }
  for (const [nis, perMapel] of Object.entries(nilaiSeed)) {
    for (const [namaMapel, perKomp] of Object.entries(perMapel)) {
      for (const [namaKomp, nilai] of Object.entries(perKomp)) {
        await prisma.nilai.create({
          data: {
            siswaId: siswaByNis[nis].id,
            komponenId: kompByMapelName[namaMapel][namaKomp],
            nilai,
          },
        });
      }
    }
  }

  console.log(`seed selesai: admin=${admin.email}, wali=${wali.email}, kelas=7A, siswa=5`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
