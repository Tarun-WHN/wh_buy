"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// ============================================================
// HELPERS
// ============================================================

async function requireView() {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  return s;
}

interface PricePoint {
  productId: string;
  vendorId: string;
  price: number;
  qty: number;
  date: Date;
}

// Unified historical price points for a product (or all products), drawn from
// price history, PO line items and quotations — the raw material for all the
// intelligence reports.
async function gatherPricePoints(productId?: string): Promise<PricePoint[]> {
  const [ph, poli, qi] = await Promise.all([
    prisma.priceHistory.findMany({
      where: productId ? { productId } : {},
      select: {
        productId: true,
        vendorId: true,
        unitPrice: true,
        quantity: true,
        recordedAt: true,
      },
    }),
    prisma.poLineItem.findMany({
      where: productId ? { productId } : {},
      select: {
        productId: true,
        unitPrice: true,
        quantity: true,
        createdAt: true,
        purchaseOrder: { select: { vendorId: true } },
      },
    }),
    prisma.quotationItem.findMany({
      where: productId ? { rfqLineItem: { productId } } : {},
      select: {
        unitPrice: true,
        quantity: true,
        createdAt: true,
        rfqLineItem: { select: { productId: true } },
        quotation: { select: { vendorId: true } },
      },
    }),
  ]);

  const points: PricePoint[] = [];
  for (const p of ph)
    if (p.unitPrice > 0)
      points.push({
        productId: p.productId,
        vendorId: p.vendorId,
        price: p.unitPrice,
        qty: p.quantity,
        date: p.recordedAt,
      });
  for (const p of poli)
    if (p.unitPrice > 0)
      points.push({
        productId: p.productId,
        vendorId: p.purchaseOrder.vendorId,
        price: p.unitPrice,
        qty: p.quantity,
        date: p.createdAt,
      });
  for (const p of qi)
    if (p.unitPrice > 0)
      points.push({
        productId: p.rfqLineItem.productId,
        vendorId: p.quotation.vendorId,
        price: p.unitPrice,
        qty: p.quantity,
        date: p.createdAt,
      });
  return points;
}

const avg = (n: number[]) => (n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0);
function median(n: number[]) {
  if (!n.length) return 0;
  const s = [...n].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ============================================================
// CAPABILITY 4 — PRICE BENCHMARKING
// ============================================================

export async function getSkuBenchmarks(search?: string) {
  await requireView();
  const points = await gatherPricePoints();

  const byProduct = new Map<string, PricePoint[]>();
  for (const p of points) {
    const a = byProduct.get(p.productId) ?? [];
    a.push(p);
    byProduct.set(p.productId, a);
  }
  const ids = [...byProduct.keys()];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, sku: true, uom: true },
  });
  const pmap = new Map(products.map((p) => [p.id, p]));

  let rows = ids.map((pid) => {
    const pts = byProduct.get(pid)!;
    const prices = pts.map((p) => p.price);
    const sorted = [...pts].sort((a, b) => a.date.getTime() - b.date.getTime());
    const half = Math.floor(sorted.length / 2);
    const olderAvg = avg(sorted.slice(0, half).map((p) => p.price)) || avg(prices);
    const recentAvg = avg(sorted.slice(half).map((p) => p.price)) || avg(prices);
    const trendPct = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    const prod = pmap.get(pid);
    return {
      productId: pid,
      name: prod?.name ?? "?",
      sku: prod?.sku ?? "",
      uom: prod?.uom ?? "",
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: avg(prices),
      median: median(prices),
      dataPoints: prices.length,
      vendorCount: new Set(pts.map((p) => p.vendorId)).size,
      trendPct,
    };
  });

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)
    );
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

// ============================================================
// CAPABILITY 1 — VENDOR CONSOLIDATION
// ============================================================

export async function getVendorConsolidation() {
  await requireView();
  const points = await gatherPricePoints();

  const byProduct = new Map<string, PricePoint[]>();
  for (const p of points) {
    const a = byProduct.get(p.productId) ?? [];
    a.push(p);
    byProduct.set(p.productId, a);
  }
  const ids = [...byProduct.keys()];
  const [products, vendors] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        sku: true,
        productGroup: {
          select: { subcategory: { select: { category: { select: { name: true } } } } },
        },
      },
    }),
    prisma.vendor.findMany({
      select: { id: true, name: true, preferenceStatus: true },
    }),
  ]);
  const pmap = new Map(products.map((p) => [p.id, p]));
  const vmap = new Map(vendors.map((v) => [v.id, v]));

  const rows = ids
    .map((pid) => {
      const pts = byProduct.get(pid)!;
      const byVendor = new Map<string, { prices: number[]; qty: number }>();
      for (const p of pts) {
        const e = byVendor.get(p.vendorId) ?? { prices: [], qty: 0 };
        e.prices.push(p.price);
        e.qty += p.qty;
        byVendor.set(p.vendorId, e);
      }
      if (byVendor.size < 2) return null;

      const vendorStats = [...byVendor.entries()].map(([vid, e]) => ({
        vendorId: vid,
        name: vmap.get(vid)?.name ?? "Unknown",
        avgRate: avg(e.prices),
        qty: e.qty,
      }));
      const minRate = Math.min(...vendorStats.map((v) => v.avgRate));
      const totalSpend = pts.reduce((a, p) => a + p.price * p.qty, 0);
      const estSavings = pts.reduce((a, p) => a + (p.price - minRate) * p.qty, 0);
      const preferred = vendorStats.reduce((b, v) => (v.avgRate < b.avgRate ? v : b));
      const prod = pmap.get(pid);

      return {
        productId: pid,
        name: prod?.name ?? "?",
        sku: prod?.sku ?? "",
        category: prod?.productGroup?.subcategory?.category?.name ?? "—",
        vendorCount: byVendor.size,
        totalSpend,
        estSavings,
        suggestedVendor: preferred.name,
        suggestedVendorId: preferred.vendorId,
        minRate,
        avgRate: avg(vendorStats.map((v) => v.avgRate)),
        vendors: vendorStats.sort((a, b) => a.avgRate - b.avgRate),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  rows.sort((a, b) => b.estSavings - a.estSavings);
  const totalOpportunity = rows.reduce((a, r) => a + r.estSavings, 0);
  return { rows, totalOpportunity };
}

// ============================================================
// CAPABILITY 3 + 6 — VENDOR RECOMMENDATION (with reasons) + NEGOTIATION
// ============================================================

export async function getVendorRecommendations(productId: string) {
  await requireView();
  if (!productId) return { product: null, recommendations: [] };

  const [points, offers, poItems, perf, product] = await Promise.all([
    gatherPricePoints(productId),
    prisma.vendorProduct.findMany({
      where: { productId },
      select: { vendorId: true, rate: true, leadTimeDays: true },
    }),
    prisma.poLineItem.findMany({
      where: { productId },
      select: { purchaseOrder: { select: { vendorId: true } } },
    }),
    prisma.vendorPerformanceEntry.findMany({
      where: {},
      select: {
        vendorId: true,
        scheduledDeliveryDate: true,
        actualDeliveryDate: true,
        manualEscalationCount: true,
      },
    }),
    prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, uom: true },
    }),
  ]);

  const byVendor = new Map<string, number[]>();
  for (const p of points) {
    const a = byVendor.get(p.vendorId) ?? [];
    a.push(p.price);
    byVendor.set(p.vendorId, a);
  }
  for (const o of offers)
    if (o.rate != null && !byVendor.has(o.vendorId))
      byVendor.set(o.vendorId, [o.rate]);

  const vendorIds = [...byVendor.keys()];
  if (!vendorIds.length) return { product, recommendations: [] };

  const vendors = await prisma.vendor.findMany({
    where: { id: { in: vendorIds } },
    select: {
      id: true,
      name: true,
      code: true,
      city: true,
      gstNumber: true,
      preferenceStatus: true,
      rating: true,
      leadTimeDays: true,
    },
  });
  const offerMap = new Map(offers.map((o) => [o.vendorId, o]));

  const poCount = new Map<string, number>();
  for (const x of poItems) {
    const v = x.purchaseOrder.vendorId;
    poCount.set(v, (poCount.get(v) ?? 0) + 1);
  }

  // Per-vendor delivery reliability from performance entries.
  const now = new Date();
  const deliv = new Map<string, { onTime: number; total: number; esc: number }>();
  for (const e of perf) {
    if (!vendorIds.includes(e.vendorId)) continue;
    const d = deliv.get(e.vendorId) ?? { onTime: 0, total: 0, esc: 0 };
    d.esc += e.manualEscalationCount;
    if (e.scheduledDeliveryDate) {
      const sched = new Date(e.scheduledDeliveryDate).getTime();
      const actual = e.actualDeliveryDate
        ? new Date(e.actualDeliveryDate).getTime()
        : null;
      if (actual || sched < now.getTime()) {
        d.total += 1;
        if (actual && actual <= sched) d.onTime += 1;
        else if (actual && actual > sched) d.esc += 1;
        else d.esc += 1; // overdue, not delivered
      }
    }
    deliv.set(e.vendorId, d);
  }

  const vendorAvg = new Map(vendorIds.map((v) => [v, avg(byVendor.get(v)!)]));
  const minAvg = Math.min(...[...vendorAvg.values()]);

  const recs = vendors
    .filter((v) => v.preferenceStatus !== "BLACKLISTED")
    .map((v) => {
      const price = vendorAvg.get(v.id)!;
      const reasons: string[] = [];

      // Price (lowest = 100, scales down as price rises above the market min)
      const priceScore = minAvg > 0 ? Math.max(0, Math.min(100, (minAvg / price) * 100)) : 50;
      if (Math.abs(price - minAvg) < 0.01)
        reasons.push(`Lowest rate at ₹${Math.round(price).toLocaleString("en-IN")}`);
      else
        reasons.push(
          `Rate ₹${Math.round(price).toLocaleString("en-IN")} (${Math.round(
            ((price - minAvg) / minAvg) * 100
          )}% above lowest)`
        );

      // Reliability
      const d = deliv.get(v.id);
      let reliability = v.rating > 0 ? v.rating * 20 : 60;
      if (d && d.total > 0) {
        reliability = (d.onTime / d.total) * 100;
        reasons.push(`On-time delivery ${Math.round(reliability)}%`);
        if (d.esc === 0) reasons.push("Zero escalations");
      }

      // Experience / repeat orders
      const repeat = poCount.get(v.id) ?? 0;
      const experience = Math.min(100, repeat * 20 + Math.min(byVendor.get(v.id)!.length, 5) * 8);
      if (repeat > 0) reasons.push(`Supplied ${repeat} time${repeat === 1 ? "" : "s"}`);

      // Preference
      const prefScore =
        v.preferenceStatus === "PREFERRED"
          ? 100
          : v.preferenceStatus === "APPROVED"
            ? 70
            : v.preferenceStatus === "CONDITIONAL" || v.preferenceStatus === "WATCHLIST"
              ? 40
              : 20;
      if (v.preferenceStatus === "PREFERRED") reasons.push("Preferred vendor");

      const offer = offerMap.get(v.id);
      const leadTime = offer?.leadTimeDays ?? v.leadTimeDays;
      if (leadTime != null) reasons.push(`Lead time ${leadTime} day${leadTime === 1 ? "" : "s"}`);
      if (v.gstNumber) reasons.push("GST compliant");
      if (v.city) reasons.push(`Based in ${v.city}`);

      const score =
        priceScore * 0.4 +
        reliability * 0.25 +
        experience * 0.2 +
        prefScore * 0.15;

      return {
        vendorId: v.id,
        name: v.name,
        code: v.code,
        preferenceStatus: v.preferenceStatus,
        avgPrice: price,
        score: Math.round(score),
        reasons,
      };
    });

  recs.sort((a, b) => b.score - a.score);
  return { product, recommendations: recs, marketMin: minAvg };
}

// ============================================================
// CAPABILITY 13 — PREFERRED VENDOR MANAGEMENT
// ============================================================

export async function setVendorPreference(vendorId: string, status: string) {
  const s = await getServerSession(authOptions);
  if (!s?.user || !hasPermission(s.user.role, PERMISSIONS.VENDOR_MANAGE))
    throw new Error("You do not have permission to change vendor status");

  const allowed = [
    "PREFERRED",
    "APPROVED",
    "CONDITIONAL",
    "WATCHLIST",
    "BLACKLISTED",
    "INACTIVE",
  ];
  if (!allowed.includes(status)) throw new Error("Invalid status");

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { preferenceStatus: status },
  });
  revalidatePath("/masters/vendors");
  revalidatePath(`/masters/vendors/${vendorId}`);
  revalidatePath("/intelligence");
}

// Lightweight product list for the recommendation SKU picker.
export async function getIntelligenceProducts(search?: string) {
  await requireView();
  return prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { sku: { contains: search } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, sku: true },
    orderBy: { name: "asc" },
    take: 50,
  });
}
