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
// DASHBOARD STATS
// ============================================================

export async function getDashboardStats() {
  await requireAuth();

  const [spendResult, openRfqs, openPos, pendingApprovals] = await Promise.all([
    prisma.purchaseOrder.aggregate({
      _sum: { totalAmount: true },
      where: { deletedAt: null, status: { not: "CANCELLED" } },
    }),
    prisma.rfq.count({
      where: {
        deletedAt: null,
        status: { in: ["DRAFT", "SENT", "PARTIALLY_RESPONDED"] },
      },
    }),
    prisma.purchaseOrder.count({
      where: {
        deletedAt: null,
        status: {
          in: [
            "DRAFT",
            "PENDING_APPROVAL",
            "APPROVED",
            "SENT",
            "ACKNOWLEDGED",
            "PARTIALLY_DELIVERED",
          ],
        },
      },
    }),
    prisma.approval.count({
      where: { status: "PENDING" },
    }),
  ]);

  return {
    totalSpend: spendResult._sum.totalAmount ?? 0,
    openRfqs,
    openPos,
    pendingApprovals,
  };
}

// ============================================================
// SPEND BY CATEGORY
// ============================================================

export async function getSpendByCategory() {
  await requireAuth();

  const lineItems = await prisma.poLineItem.findMany({
    where: {
      purchaseOrder: { deletedAt: null, status: { not: "CANCELLED" } },
    },
    select: {
      totalPrice: true,
      productId: true,
    },
  });

  // Get product -> productGroup -> subcategory -> category mapping
  const productIds = [...new Set(lineItems.map((li) => li.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      productGroup: {
        select: {
          subcategory: {
            select: {
              category: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  });

  const productCategoryMap = new Map<string, { id: string; name: string }>();
  for (const p of products) {
    productCategoryMap.set(p.id, p.productGroup.subcategory.category);
  }

  const categorySpend = new Map<string, { name: string; total: number }>();
  for (const li of lineItems) {
    const cat = productCategoryMap.get(li.productId);
    if (!cat) continue;
    const existing = categorySpend.get(cat.id) ?? { name: cat.name, total: 0 };
    existing.total += li.totalPrice;
    categorySpend.set(cat.id, existing);
  }

  return Array.from(categorySpend.values())
    .sort((a, b) => b.total - a.total)
    .map((c) => ({ name: c.name, value: Math.round(c.total * 100) / 100 }));
}

// ============================================================
// SPEND BY WAREHOUSE
// ============================================================

export async function getSpendByWarehouse() {
  await requireAuth();

  const pos = await prisma.purchaseOrder.findMany({
    where: { deletedAt: null, status: { not: "CANCELLED" } },
    select: {
      totalAmount: true,
      warehouse: { select: { id: true, name: true } },
    },
  });

  const warehouseSpend = new Map<string, { name: string; total: number }>();
  for (const po of pos) {
    const existing = warehouseSpend.get(po.warehouse.id) ?? {
      name: po.warehouse.name,
      total: 0,
    };
    existing.total += po.totalAmount;
    warehouseSpend.set(po.warehouse.id, existing);
  }

  return Array.from(warehouseSpend.values())
    .sort((a, b) => b.total - a.total)
    .map((w) => ({ name: w.name, value: Math.round(w.total * 100) / 100 }));
}

// ============================================================
// SPEND BY VENDOR (TOP 10)
// ============================================================

export async function getSpendByVendor() {
  await requireAuth();

  const pos = await prisma.purchaseOrder.findMany({
    where: { deletedAt: null, status: { not: "CANCELLED" } },
    select: {
      totalAmount: true,
      vendor: { select: { id: true, name: true } },
    },
  });

  const vendorSpend = new Map<string, { name: string; total: number }>();
  for (const po of pos) {
    const existing = vendorSpend.get(po.vendor.id) ?? {
      name: po.vendor.name,
      total: 0,
    };
    existing.total += po.totalAmount;
    vendorSpend.set(po.vendor.id, existing);
  }

  return Array.from(vendorSpend.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((v) => ({ name: v.name, value: Math.round(v.total * 100) / 100 }));
}

// ============================================================
// PROCUREMENT TRENDS (MONTHLY SPEND, LAST 12 MONTHS)
// ============================================================

export async function getProcurementTrends() {
  await requireAuth();

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const pos = await prisma.purchaseOrder.findMany({
    where: {
      deletedAt: null,
      status: { not: "CANCELLED" },
      createdAt: { gte: twelveMonthsAgo },
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
  });

  const monthlySpend = new Map<string, number>();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push(key);
    monthlySpend.set(key, 0);
  }

  for (const po of pos) {
    const d = new Date(po.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthlySpend.has(key)) {
      monthlySpend.set(key, (monthlySpend.get(key) ?? 0) + po.totalAmount);
    }
  }

  return months.map((month) => ({
    month,
    spend: Math.round((monthlySpend.get(month) ?? 0) * 100) / 100,
  }));
}

// ============================================================
// TOP 5 VENDORS BY SPEND
// ============================================================

export async function getTopVendors() {
  await requireAuth();

  const pos = await prisma.purchaseOrder.findMany({
    where: { deletedAt: null, status: { not: "CANCELLED" } },
    select: {
      totalAmount: true,
      vendor: { select: { id: true, name: true } },
    },
  });

  const vendorSpend = new Map<
    string,
    { name: string; total: number; poCount: number }
  >();
  for (const po of pos) {
    const existing = vendorSpend.get(po.vendor.id) ?? {
      name: po.vendor.name,
      total: 0,
      poCount: 0,
    };
    existing.total += po.totalAmount;
    existing.poCount += 1;
    vendorSpend.set(po.vendor.id, existing);
  }

  return Array.from(vendorSpend.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((v) => ({
      name: v.name,
      spend: Math.round(v.total * 100) / 100,
      poCount: v.poCount,
    }));
}

// ============================================================
// SAVINGS DATA
// ============================================================

export async function getSavingsData() {
  await requireAuth();

  const poLineItems = await prisma.poLineItem.findMany({
    where: {
      purchaseOrder: { deletedAt: null, status: { not: "CANCELLED" } },
    },
    select: {
      productId: true,
      productName: true,
      unitPrice: true,
      quantity: true,
      totalPrice: true,
    },
  });

  const productIds = [...new Set(poLineItems.map((li) => li.productId))];

  // Get average historical price for each product
  const priceHistories = await prisma.priceHistory.findMany({
    where: { productId: { in: productIds } },
    select: { productId: true, unitPrice: true },
  });

  const avgPriceMap = new Map<string, number>();
  const priceCountMap = new Map<string, number[]>();
  for (const ph of priceHistories) {
    const prices = priceCountMap.get(ph.productId) ?? [];
    prices.push(ph.unitPrice);
    priceCountMap.set(ph.productId, prices);
  }
  for (const [productId, prices] of priceCountMap) {
    // Use last 10 prices
    const recent = prices.slice(-10);
    avgPriceMap.set(
      productId,
      recent.reduce((s, p) => s + p, 0) / recent.length
    );
  }

  let totalSavings = 0;
  let totalPotentialSpend = 0;
  const savingsByProduct: {
    productName: string;
    avgPrice: number;
    poPrice: number;
    quantity: number;
    savings: number;
  }[] = [];

  for (const li of poLineItems) {
    const avgPrice = avgPriceMap.get(li.productId);
    if (avgPrice === undefined) continue;
    const saving = (avgPrice - li.unitPrice) * li.quantity;
    totalPotentialSpend += avgPrice * li.quantity;
    if (saving > 0) {
      totalSavings += saving;
      savingsByProduct.push({
        productName: li.productName,
        avgPrice: Math.round(avgPrice * 100) / 100,
        poPrice: li.unitPrice,
        quantity: li.quantity,
        savings: Math.round(saving * 100) / 100,
      });
    }
  }

  return {
    totalSavings: Math.round(totalSavings * 100) / 100,
    totalPotentialSpend: Math.round(totalPotentialSpend * 100) / 100,
    savingsPercent:
      totalPotentialSpend > 0
        ? Math.round((totalSavings / totalPotentialSpend) * 10000) / 100
        : 0,
    details: savingsByProduct.sort((a, b) => b.savings - a.savings).slice(0, 50),
  };
}

// ============================================================
// VENDOR SCORECARD
// ============================================================

export async function getVendorScorecard(vendorId: string) {
  await requireAuth();

  const scorecard = await prisma.vendorScorecard.findFirst({
    where: { vendorId },
    orderBy: { createdAt: "desc" },
    include: {
      vendor: { select: { id: true, name: true, code: true } },
    },
  });

  if (scorecard) return scorecard;

  // Calculate a basic scorecard if none exists
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, name: true, code: true, rating: true },
  });

  if (!vendor) throw new Error("Vendor not found");

  const poCount = await prisma.purchaseOrder.count({
    where: { vendorId, deletedAt: null },
  });

  return {
    id: null,
    vendorId: vendor.id,
    vendor,
    period: "current",
    deliveryScore: 0,
    qualityScore: 0,
    priceScore: 0,
    responseScore: 0,
    overallScore: vendor.rating,
    remarks: poCount === 0 ? "No purchase orders yet" : null,
    poCount,
  };
}

// ============================================================
// RECENT ACTIVITY FOR DASHBOARD
// ============================================================

export async function getRecentActivity() {
  await requireAuth();

  const [requirements, rfqs, pos] = await Promise.all([
    prisma.requirement.findMany({
      where: { deletedAt: null },
      select: { id: true, number: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.rfq.findMany({
      where: { deletedAt: null },
      select: { id: true, number: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.purchaseOrder.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        number: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        vendor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return { requirements, rfqs, pos };
}

// ============================================================
// EXTENDED STATS FOR PROCUREMENT ANALYTICS
// ============================================================

export async function getProcurementStats() {
  await requireAuth();

  const [totalRfqs, totalPos, avgPoResult, activeVendors] = await Promise.all([
    prisma.rfq.count({ where: { deletedAt: null } }),
    prisma.purchaseOrder.count({ where: { deletedAt: null } }),
    prisma.purchaseOrder.aggregate({
      _avg: { totalAmount: true },
      where: { deletedAt: null, status: { not: "CANCELLED" } },
    }),
    prisma.vendor.count({
      where: { deletedAt: null, isActive: true, registrationStatus: "APPROVED" },
    }),
  ]);

  return {
    totalRfqs,
    totalPos,
    avgPoValue: avgPoResult._avg.totalAmount ?? 0,
    activeVendors,
  };
}
