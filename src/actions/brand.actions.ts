"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const PATH = "/masters/brands";

async function requireManage() {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  if (!hasPermission(s.user.role, PERMISSIONS.PRODUCT_MANAGE))
    throw new Error("You do not have permission to manage brands");
  return s;
}

// Ensure a default "Local / Non-branded" brand exists (lazy-seed so it appears
// even on already-seeded production databases).
async function ensureDefaults() {
  const count = await prisma.brand.count();
  if (count === 0) {
    await prisma.brand.createMany({
      data: [{ name: "Local / Non-branded" }],
    });
  }
}

export async function getBrands() {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  await ensureDefaults();
  return prisma.brand.findMany({
    where: { deletedAt: null },
    orderBy: [{ name: "asc" }],
  });
}

// Options for pickers (active only).
export async function getBrandOptions() {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  await ensureDefaults();
  return prisma.brand.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

const brandSchema = z.object({ name: z.string().min(1, "Name is required") });

export async function createBrand(data: z.infer<typeof brandSchema>) {
  await requireManage();
  const p = brandSchema.parse(data);
  const existing = await prisma.brand.findFirst({
    where: { name: { equals: p.name.trim() } },
  });
  if (existing) {
    if (existing.deletedAt) {
      const restored = await prisma.brand.update({
        where: { id: existing.id },
        data: { deletedAt: null, isActive: true },
      });
      revalidatePath(PATH);
      return restored;
    }
    throw new Error("A brand with this name already exists");
  }
  const brand = await prisma.brand.create({ data: { name: p.name.trim() } });
  revalidatePath(PATH);
  return brand;
}

export async function updateBrand(id: string, data: z.infer<typeof brandSchema> & { isActive?: boolean }) {
  await requireManage();
  const p = brandSchema.parse({ name: data.name });
  await prisma.brand.update({
    where: { id },
    data: { name: p.name.trim(), isActive: data.isActive },
  });
  revalidatePath(PATH);
}

export async function deleteBrand(id: string) {
  await requireManage();
  await prisma.brand.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
  revalidatePath(PATH);
}
