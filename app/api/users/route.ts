import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { err, created } from "@/lib/api";

const ROLES = ["admin", "walikelas", "guru"];

export async function GET() {
  const rows = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
  return Response.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { name, email, password, role } = body ?? {};
  if (!name || !email || !password) return err("name, email, password wajib diisi");
  if (!ROLES.includes(role)) return err("role harus salah satu: " + ROLES.join(", "));
  if (await prisma.user.findUnique({ where: { email } })) return err("email sudah dipakai", 409);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: createHash("sha256").update(password).digest("hex"),
      role,
    },
    select: { id: true, name: true, email: true, role: true },
  });
  return created(user);
}
