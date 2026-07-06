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

// ============================================================
// CAPABILITY 4 (deep) — SKU PRICE DETAIL (vendor / state / monthly)
// ============================================================

export async function getSkuPriceDetail(productId: string) {
  await requireView();
  const [product, points, poItems] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, uom: true },
    }),
    gatherPricePoints(productId),
    prisma.poLineItem.findMany({
      where: { productId },
      select: {
        unitPrice: true,
        purchaseOrder: {
          select: {
            warehouse: {
              select: { city: { select: { state: { select: { name: true } } } } },
            },
          },
        },
      },
    }),
  ]);
  if (!product) throw new Error("Product not found");
  if (points.length === 0)
    return {
      product,
      stats: null,
      vendorWise: [],
      stateWise: [],
      monthly: [],
      alerts: [],
    };

  const prices = points.map((p) => p.price);
  const stats = {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: avg(prices),
    median: median(prices),
    count: prices.length,
  };

  // vendor-wise
  const vendorIds = [...new Set(points.map((p) => p.vendorId))];
  const vendors = await prisma.vendor.findMany({
    where: { id: { in: vendorIds } },
    select: { id: true, name: true },
  });
  const vmap = new Map(vendors.map((v) => [v.id, v.name]));
  const byVendor = new Map<string, PricePoint[]>();
  for (const p of points) {
    const a = byVendor.get(p.vendorId) ?? [];
    a.push(p);
    byVendor.set(p.vendorId, a);
  }
  const vendorWise = [...byVendor.entries()]
    .map(([vid, pts]) => {
      const pr = pts.map((x) => x.price);
      return {
        vendor: vmap.get(vid) ?? "Unknown",
        min: Math.min(...pr),
        avg: avg(pr),
        max: Math.max(...pr),
        count: pr.length,
        last: pts.reduce((a, b) => (a.date > b.date ? a : b)).price,
      };
    })
    .sort((a, b) => a.avg - b.avg);

  // state-wise (PO line items only — they carry a warehouse)
  const byState = new Map<string, number[]>();
  for (const it of poItems) {
    const st = it.purchaseOrder.warehouse?.city?.state?.name ?? "Unknown";
    const a = byState.get(st) ?? [];
    a.push(it.unitPrice);
    byState.set(st, a);
  }
  const stateWise = [...byState.entries()]
    .map(([state, pr]) => ({ state, avg: avg(pr), count: pr.length }))
    .sort((a, b) => b.count - a.count);

  // monthly trend
  const byMonth = new Map<string, number[]>();
  for (const p of points) {
    const key = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, "0")}`;
    const a = byMonth.get(key) ?? [];
    a.push(p.price);
    byMonth.set(key, a);
  }
  const monthly = [...byMonth.entries()]
    .map(([month, pr]) => ({ month, avg: avg(pr), count: pr.length }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // alerts
  const latest = points.reduce((a, b) => (a.date > b.date ? a : b));
  const alerts: { type: string; message: string }[] = [];
  if (latest.price > stats.avg * 1.15)
    alerts.push({
      type: "warning",
      message: `Latest rate ₹${Math.round(latest.price).toLocaleString(
        "en-IN"
      )} is ${Math.round(
        (latest.price / stats.avg - 1) * 100
      )}% above the average — possible price increase.`,
    });
  if (latest.price < stats.avg * 0.7)
    alerts.push({
      type: "info",
      message: `Latest rate ₹${Math.round(latest.price).toLocaleString(
        "en-IN"
      )} is unusually low vs average ₹${Math.round(stats.avg).toLocaleString(
        "en-IN"
      )} — worth verifying for a data error.`,
    });
  if (stats.max / stats.min > 1.2)
    alerts.push({
      type: "opportunity",
      message: `Rates range ₹${Math.round(stats.min).toLocaleString(
        "en-IN"
      )}–₹${Math.round(stats.max).toLocaleString(
        "en-IN"
      )} across sources — negotiation opportunity toward the lowest.`,
    });

  return { product, stats, vendorWise, stateWise, monthly, alerts };
}

// ============================================================
// CAPABILITY 5 — PROCUREMENT KNOWLEDGE GRAPH
// ============================================================

export async function getKnowledgeInsights() {
  await requireView();
  const [vps, poItems, qItems, products, vendors] = await Promise.all([
    prisma.vendorProduct.findMany({ select: { vendorId: true, productId: true } }),
    prisma.poLineItem.findMany({
      select: {
        productId: true,
        purchaseOrder: { select: { vendorId: true, warehouseId: true } },
      },
    }),
    prisma.quotationItem.findMany({
      select: {
        rfqLineItem: { select: { productId: true } },
        quotation: { select: { vendorId: true } },
      },
    }),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        productGroup: {
          select: {
            subcategory: { select: { category: { select: { id: true } } } },
          },
        },
      },
    }),
    prisma.vendor.findMany({ select: { id: true, name: true } }),
  ]);

  const vmap = new Map(vendors.map((v) => [v.id, v.name]));
  const catOf = new Map(
    products.map((p) => [p.id, p.productGroup?.subcategory?.category?.id])
  );
  const nameOf = new Map(products.map((p) => [p.id, { name: p.name, sku: p.sku }]));

  const vProducts = new Map<string, Set<string>>();
  const vWarehouses = new Map<string, Set<string>>();
  const vCategories = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, k: string, v: string) => {
    const s = m.get(k) ?? new Set<string>();
    s.add(v);
    m.set(k, s);
  };

  for (const vp of vps) {
    add(vProducts, vp.vendorId, vp.productId);
    const c = catOf.get(vp.productId);
    if (c) add(vCategories, vp.vendorId, c);
  }
  for (const it of poItems) {
    const v = it.purchaseOrder.vendorId;
    add(vProducts, v, it.productId);
    if (it.purchaseOrder.warehouseId) add(vWarehouses, v, it.purchaseOrder.warehouseId);
    const c = catOf.get(it.productId);
    if (c) add(vCategories, v, c);
  }
  for (const it of qItems) {
    const v = it.quotation.vendorId;
    add(vProducts, v, it.rfqLineItem.productId);
    const c = catOf.get(it.rfqLineItem.productId);
    if (c) add(vCategories, v, c);
  }

  const rank = (m: Map<string, Set<string>>) =>
    [...m.entries()]
      .map(([vid, s]) => ({ vendorId: vid, vendor: vmap.get(vid) ?? "?", count: s.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

  // SKUs bought at very different rates across vendors
  const points = await gatherPricePoints();
  const byProd = new Map<string, Map<string, number[]>>();
  for (const p of points) {
    const vm = byProd.get(p.productId) ?? new Map<string, number[]>();
    const a = vm.get(p.vendorId) ?? [];
    a.push(p.price);
    vm.set(p.vendorId, a);
    byProd.set(p.productId, vm);
  }
  const rateSpread = [...byProd.entries()]
    .map(([pid, vm]) => {
      const vendorAvgs = [...vm.values()].map((pr) => avg(pr));
      if (vendorAvgs.length < 2) return null;
      const mn = Math.min(...vendorAvgs);
      const mx = Math.max(...vendorAvgs);
      const info = nameOf.get(pid);
      return {
        productId: pid,
        name: info?.name ?? "?",
        sku: info?.sku ?? "",
        min: mn,
        max: mx,
        spreadPct: mn > 0 ? ((mx - mn) / mn) * 100 : 0,
        vendorCount: vm.size,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.spreadPct - a.spreadPct)
    .slice(0, 5);

  return {
    widestRange: rank(vProducts),
    mostWarehouses: rank(vWarehouses),
    mostCategories: rank(vCategories),
    rateSpread,
  };
}

export async function getVendor360(vendorId: string) {
  await requireView();
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      name: true,
      code: true,
      city: true,
      state: true,
      gstNumber: true,
      preferenceStatus: true,
    },
  });
  if (!vendor) throw new Error("Vendor not found");

  const [pos, quotes, offers] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { vendorId, deletedAt: null },
      select: {
        warehouse: {
          select: {
            name: true,
            city: { select: { state: { select: { name: true } } } },
          },
        },
        lineItems: { select: { productId: true, productName: true, unitPrice: true } },
      },
    }),
    prisma.quotation.count({ where: { vendorId } }),
    prisma.vendorProduct.findMany({
      where: { vendorId },
      select: {
        rate: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            productGroup: {
              select: {
                subcategory: { select: { category: { select: { name: true } } } },
              },
            },
          },
        },
      },
    }),
  ]);

  const prodMap = new Map<
    string,
    { name: string; sku: string; category: string; rate: number | null }
  >();
  for (const o of offers)
    prodMap.set(o.product.id, {
      name: o.product.name,
      sku: o.product.sku,
      category: o.product.productGroup?.subcategory?.category?.name ?? "—",
      rate: o.rate,
    });
  for (const po of pos)
    for (const li of po.lineItems)
      if (!prodMap.has(li.productId))
        prodMap.set(li.productId, {
          name: li.productName,
          sku: "",
          category: "—",
          rate: li.unitPrice,
        });

  const products = [...prodMap.values()];
  const whMap = new Map<string, string>();
  const states = new Set<string>();
  for (const po of pos)
    if (po.warehouse) {
      const st = po.warehouse.city?.state?.name ?? "";
      whMap.set(po.warehouse.name, st);
      if (st) states.add(st);
    }
  const categories = [
    ...new Set(products.map((p) => p.category).filter((c) => c && c !== "—")),
  ];

  return {
    vendor,
    products,
    categories,
    warehouses: [...whMap.entries()].map(([name, state]) => ({ name, state })),
    states: [...states],
    poCount: pos.length,
    quoteCount: quotes,
  };
}

export async function getKnowledgeVendors() {
  await requireView();
  return prisma.vendor.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}
