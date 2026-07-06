"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { generateNumber } from "@/lib/utils";

const PATH = "/quality";

async function requireManage() {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  if (
    !hasPermission(s.user.role, PERMISSIONS.GRN_CREATE) &&
    !hasPermission(s.user.role, PERMISSIONS.VENDOR_MANAGE)
  )
    throw new Error("You do not have permission to manage quality claims");
  return s;
}

// ============================================================
// READ
// ============================================================

export async function getQualityClaims(filters?: { status?: string; vendorId?: string }) {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");

  const claims = await prisma.qualityClaim.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.vendorId ? { vendorId: filters.vendorId } : {}),
    },
    include: { vendor: { select: { name: true, code: true } } },
    orderBy: { raisedDate: "desc" },
  });

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  return claims.map((c) => ({
    id: c.id,
    number: c.number,
    vendorId: c.vendorId,
    vendorName: c.vendor.name,
    vendorCode: c.vendor.code,
    productName: c.productName,
    poNumber: c.poNumber,
    type: c.type,
    severity: c.severity,
    status: c.status,
    quantity: c.quantity,
    description: c.description,
    raisedDate: c.raisedDate.toISOString(),
    resolvedDate: c.resolvedDate ? c.resolvedDate.toISOString() : null,
    resolutionDays: c.resolvedDate
      ? Math.max(0, Math.round((c.resolvedDate.getTime() - c.raisedDate.getTime()) / DAY))
      : Math.round((now - c.raisedDate.getTime()) / DAY),
  }));
}

export async function getQualityStats() {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  const claims = await prisma.qualityClaim.findMany({
    select: { status: true, type: true, raisedDate: true, resolvedDate: true },
  });
  const DAY = 24 * 60 * 60 * 1000;
  const resolved = claims.filter((c) => c.resolvedDate);
  const avgResolution =
    resolved.length > 0
      ? Math.round(
          resolved.reduce(
            (a, c) => a + (c.resolvedDate!.getTime() - c.raisedDate.getTime()) / DAY,
            0
          ) / resolved.length
        )
      : null;

  const byType = new Map<string, number>();
  for (const c of claims) byType.set(c.type, (byType.get(c.type) ?? 0) + 1);

  return {
    total: claims.length,
    open: claims.filter((c) => c.status === "OPEN").length,
    inProgress: claims.filter((c) => c.status === "IN_PROGRESS").length,
    resolved: claims.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length,
    avgResolutionDays: avgResolution,
    byType: [...byType.entries()].map(([label, value]) => ({ label, value })),
  };
}

export async function getClaimVendors() {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  return prisma.vendor.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

// ============================================================
// MUTATIONS
// ============================================================

const claimSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  type: z.enum(["REJECTION", "QUALITY", "REPLACEMENT", "WARRANTY", "DAMAGE"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  productName: z.string().optional(),
  poNumber: z.string().optional(),
  quantity: z.coerce.number().min(0).optional(),
  description: z.string().min(1, "Description is required"),
});

export async function createQualityClaim(data: z.infer<typeof claimSchema>) {
  const s = await requireManage();
  const p = claimSchema.parse(data);
  const count = await prisma.qualityClaim.count();

  await prisma.qualityClaim.create({
    data: {
      number: generateNumber("QC", count + 1),
      vendorId: p.vendorId,
      type: p.type,
      severity: p.severity,
      productName: p.productName,
      poNumber: p.poNumber,
      quantity: p.quantity,
      description: p.description,
      createdById: s.user.id,
    },
  });
  revalidatePath(PATH);
}

export async function updateClaimStatus(id: string, status: string) {
  await requireManage();
  const allowed = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (!allowed.includes(status)) throw new Error("Invalid status");

  const existing = await prisma.qualityClaim.findUnique({ where: { id } });
  if (!existing) throw new Error("Claim not found");

  const isDone = status === "RESOLVED" || status === "CLOSED";
  await prisma.qualityClaim.update({
    where: { id },
    data: {
      status,
      resolvedDate: isDone ? existing.resolvedDate ?? new Date() : null,
    },
  });
  revalidatePath(PATH);
}

export async function deleteQualityClaim(id: string) {
  await requireManage();
  await prisma.qualityClaim.delete({ where: { id } });
  revalidatePath(PATH);
}
