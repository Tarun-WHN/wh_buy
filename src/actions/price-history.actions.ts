"use server";

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";

// ============================================================
// HELPERS
// ============================================================

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// ============================================================
// GET PRICE HISTORY
// ============================================================

export async function getPriceHistory(productId: string, vendorId?: string) {
  await requireAuth();

  const where: Record<string, unknown> = { productId };
  if (vendorId) {
    where.vendorId = vendorId;
  }

  return prisma.priceHistory.findMany({
    where,
    orderBy: { recordedAt: "desc" },
    take: 10,
  });
}

// ============================================================
// RECORD PRICE
// ============================================================

export async function recordPrice(data: {
  productId: string;
  vendorId: string;
  unitPrice: number;
  quantity: number;
  sourceType: string;
  sourceId: string;
}) {
  await requireAuth();

  return prisma.priceHistory.create({
    data: {
      productId: data.productId,
      vendorId: data.vendorId,
      unitPrice: data.unitPrice,
      quantity: data.quantity,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
    },
  });
}

// ============================================================
// GET AVERAGE PRICE
// ============================================================

export async function getAveragePrice(productId: string) {
  await requireAuth();

  const result = await prisma.priceHistory.aggregate({
    where: { productId },
    _avg: { unitPrice: true },
    _min: { unitPrice: true },
    _max: { unitPrice: true },
    _count: true,
  });

  return {
    average: result._avg.unitPrice ?? 0,
    min: result._min.unitPrice ?? 0,
    max: result._max.unitPrice ?? 0,
    count: result._count,
  };
}
