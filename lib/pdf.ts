import { PDFDocument, StandardFonts, PDFFont, PDFPage, rgb } from "pdf-lib";

export type RaporMapelRow = {
  name: string;
  kkm: number;
  nilaiAkhir: number | null;
  predikat: string | null;
  deskripsi: string | null;
  remedial: boolean;
};

export type RaporSiswaData = {
  namaSekolah: string;
  alamatSekolah: string;
  semester: string;
  tahunAjaran: string;
  siswa: { nis: string; name: string; kelasName: string };
  mapel: RaporMapelRow[];
  rataRata: number | null;
  waliKelasName: string;
  tanggal: string; // mis. "3 Oktober 2026"
};

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 40;

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      // kata tunggal yang terlalu panjang: potong paksa
      let rest = w;
      line = "";
      while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

type Ctx = {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
};

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
}

function ensureSpace(ctx: Ctx, need: number) {
  if (ctx.y - need < MARGIN + 60) newPage(ctx);
}

function centered(ctx: Ctx, text: string, size: number, bold = false) {
  const f = bold ? ctx.bold : ctx.font;
  const w = f.widthOfTextAtSize(text, size);
  ctx.page.drawText(text, {
    x: (PAGE_W - w) / 2,
    y: ctx.y,
    size,
    font: f,
  });
  ctx.y -= size + 6;
}

export async function generateRaporPdf(d: RaporSiswaData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { doc, font, bold, page: doc.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN };

  // ---- Kop ----
  centered(ctx, d.namaSekolah.toUpperCase(), 16, true);
  centered(ctx, d.alamatSekolah, 10);
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y + 2 }, end: { x: PAGE_W - MARGIN, y: ctx.y + 2 }, thickness: 2 });
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y - 2 }, end: { x: PAGE_W - MARGIN, y: ctx.y - 2 }, thickness: 0.5 });
  ctx.y -= 16;

  centered(ctx, "RAPOR HASIL BELAJAR PESERTA DIDIK", 13, true);
  centered(ctx, `Semester ${d.semester} Tahun Ajaran ${d.tahunAjaran}`, 11);
  ctx.y -= 6;

  // ---- Identitas ----
  const identitas: [string, string][] = [
    ["Nama", d.siswa.name],
    ["NIS", d.siswa.nis],
    ["Kelas", d.siswa.kelasName],
  ];
  for (const [label, val] of identitas) {
    ctx.page.drawText(label, { x: MARGIN, y: ctx.y, size: 11, font });
    ctx.page.drawText(":", { x: MARGIN + 110, y: ctx.y, size: 11, font });
    ctx.page.drawText(val, { x: MARGIN + 122, y: ctx.y, size: 11, font: bold });
    ctx.y -= 17;
  }
  ctx.y -= 8;

  // ---- Tabel nilai ----
  // Kolom: No | Mata Pelajaran | KKM | Nilai | Predikat | Keterangan
  const cols = [
    { key: "no", label: "No", w: 30 },
    { key: "mapel", label: "Mata Pelajaran", w: 120 },
    { key: "kkm", label: "KKM", w: 40 },
    { key: "nilai", label: "Nilai", w: 45 },
    { key: "predikat", label: "Predikat", w: 55 },
    { key: "ket", label: "Keterangan", w: 0 },
  ];
  const tableW = PAGE_W - MARGIN * 2;
  const fixedW = cols.slice(0, 5).reduce((a, c) => a + c.w, 0);
  cols[5].w = tableW - fixedW;
  const size = 9;
  const lh = 12;

  const drawRow = (cells: string[], isHeader: boolean) => {
    const f = isHeader ? bold : font;
    const wrapped = cells.map((c, i) => wrapText(c, f, size, cols[i].w - 8));
    const maxLines = Math.max(...wrapped.map((w) => w.length));
    const rowH = maxLines * lh + 8;
    ensureSpace(ctx, rowH);
    let x = MARGIN;
    const yTop = ctx.y;
    cols.forEach((col, i) => {
      if (isHeader) {
        ctx.page.drawRectangle({
          x,
          y: yTop - rowH,
          width: col.w,
          height: rowH,
          color: rgb(0.9, 0.92, 0.95),
        });
      }
      ctx.page.drawRectangle({
        x,
        y: yTop - rowH,
        width: col.w,
        height: rowH,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.5,
      });
      const lines = wrapped[i];
      lines.forEach((ln, li) => {
        const alignCenter = i === 0 || i === 2 || i === 3 || i === 4;
        const tw = f.widthOfTextAtSize(ln, size);
        const tx = alignCenter ? x + (col.w - tw) / 2 : x + 4;
        ctx.page.drawText(ln, {
          x: tx,
          y: yTop - 6 - lh * (li + 1) + 3,
          size,
          font: f,
        });
      });
      x += col.w;
    });
    ctx.y = yTop - rowH;
  };

  drawRow(cols.map((c) => c.label), true);
  d.mapel.forEach((m, i) => {
    const ket = m.remedial
      ? `REMEDIAL — ${m.deskripsi ?? ""}`
      : m.deskripsi ?? "-";
    drawRow(
      [
        String(i + 1),
        m.name,
        String(m.kkm),
        m.nilaiAkhir === null ? "-" : String(m.nilaiAkhir),
        m.predikat ?? "-",
        ket,
      ],
      false
    );
  });
  ctx.y -= 14;

  // ---- Rata-rata & catatan ----
  ctx.page.drawText("Rata-rata nilai:", { x: MARGIN, y: ctx.y, size: 11, font });
  ctx.page.drawText(d.rataRata === null ? "-" : String(d.rataRata), {
    x: MARGIN + 110,
    y: ctx.y,
    size: 11,
    font: bold,
  });
  ctx.y -= 20;
  const remedialMapel = d.mapel.filter((m) => m.remedial).map((m) => m.name);
  if (remedialMapel.length > 0) {
    const catatan = `Catatan: wajib mengikuti remedial untuk: ${remedialMapel.join(", ")}.`;
    for (const ln of wrapText(catatan, font, 10, tableW)) {
      ensureSpace(ctx, 14);
      ctx.page.drawText(ln, { x: MARGIN, y: ctx.y, size: 10, font });
      ctx.y -= 14;
    }
    ctx.y -= 6;
  }

  // ---- Tanda tangan ----
  ensureSpace(ctx, 120);
  ctx.y -= 10;
  const colW = tableW / 3;
  const ttd: [string, string, string][] = [
    ["Mengetahui,", "Orang Tua/Wali", "( ............................ )"],
    ["", "Kepala Sekolah", "( ............................ )"],
    [`${d.tanggal}`, "Wali Kelas", `( ${d.waliKelasName} )`],
  ];
  const yTtd = ctx.y;
  ttd.forEach(([l1, l2, l3], i) => {
    const cx = MARGIN + colW * i + colW / 2;
    const drawC = (t: string, dy: number, f: PDFFont, s: number) => {
      const w = f.widthOfTextAtSize(t, s);
      ctx.page.drawText(t, { x: cx - w / 2, y: yTtd - dy, size: s, font: f });
    };
    if (l1) drawC(l1, 0, font, 10);
    drawC(l2, 16, font, 10);
    drawC(l3, 86, font, 10);
  });
  ctx.y = yTtd - 100;

  return doc.save();
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function tanggalIndonesia(d = new Date()): string {
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function slugNama(nama: string): string {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
