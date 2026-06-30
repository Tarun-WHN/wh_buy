"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const PERF_PATH = "/vendor-performance";

// Rating weights — "Delivery & quality focused". Adjustable later.
// NOTE: not exported — "use server" modules may only export async functions.
// The weights are returned to the client via getVendorPerformance().
const PERFORMANCE_WEIGHTS = {
  delivery: 0.35,
  quality: 0.3,
  pricing: 0.2,
  quotation: 0.15,
} as const;

async function requireManage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, PERMISSIONS.VENDOR_MANAGE)) {
    throw new Error("You do not have permission to manage vendor performance");
  }
  return session;
}

// ============================================================
// SYNC FROM RECORDS (auto rows from quotations)
// ============================================================

export async function syncVendorPerformance() {
  await requireManage();

  const quotations = await prisma.quotation.findMany({
    include: {
      vendor: { select: { id: true, name: true } },
      rfq: {
        select: {
          number: true,
          createdAt: true,
          submissionDeadline: true,
          lineItems: { select: { product: { select: { name: true } } } },
        },
      },
    },
  });

  // Rank quotations within each RFQ by total amount (lowest = L1).
  const byRfq = new Map<string, typeof quotations>();
  for (const q of quotations) {
    const arr = byRfq.get(q.rfqId) ?? [];
    arr.push(q);
    byRfq.set(q.rfqId, arr);
  }
  const levelOf = new Map<string, number>();
  for (const arr of byRfq.values()) {
    const ranked = [...arr]
      .filter((q) => q.totalAmount > 0)
      .sort((a, b) => a.totalAmount - b.totalAmount);
    ranked.forEach((q, i) => levelOf.set(q.id, i + 1));
  }

  let synced = 0;
  for (const q of quotations) {
    // Find this vendor's PO from the same RFQ for delivery dates.
    const po = await prisma.purchaseOrder.findFirst({
      where: { rfqId: q.rfqId, vendorId: q.vendorId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        deliveries: {
          select: { expectedDate: true, deliveredDate: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const scheduledDeliveryDate =
      po?.deliveryDate ??
      po?.deliveries.find((d) => d.expectedDate)?.expectedDate ??
      null;
    const deliveredDates =
      po?.deliveries.map((d) => d.deliveredDate).filter(Boolean) ?? [];
    const actualDeliveryDate =
      deliveredDates.length > 0
        ? new Date(Math.max(...deliveredDates.map((d) => new Date(d!).getTime())))
        : null;

    const productLabel =
      [...new Set(q.rfq.lineItems.map((li) => li.product.name))].join(", ") ||
      null;

    await prisma.vendorPerformanceEntry.upsert({
      where: { quotationId: q.id },
      // Record-derived fields are (re)written on every sync.
      create: {
        source: "AUTO",
        quotationId: q.id,
        vendorId: q.vendorId,
        vendorName: q.vendor.name,
        rfqCode: q.rfq.number,
        rfqDate: q.rfq.createdAt,
        submissionDeadline: q.rfq.submissionDeadline,
        quoteSubmissionDate: q.submittedAt,
        quotedRate: q.totalAmount || null,
        productLabel,
        pricingLevel: levelOf.get(q.id) ?? null,
        scheduledDeliveryDate,
        actualDeliveryDate,
      },
      update: {
        vendorId: q.vendorId,
        vendorName: q.vendor.name,
        rfqCode: q.rfq.number,
        rfqDate: q.rfq.createdAt,
        submissionDeadline: q.rfq.submissionDeadline,
        quoteSubmissionDate: q.submittedAt,
        quotedRate: q.totalAmount || null,
        productLabel,
        pricingLevel: levelOf.get(q.id) ?? null,
        scheduledDeliveryDate,
        actualDeliveryDate,
        // modelMake / escalations / remarks are intentionally preserved.
      },
    });
    synced++;
  }

  revalidatePath(PERF_PATH);
  return { synced };
}

// ============================================================
// READ + RATING
// ============================================================

function isLate(scheduled: Date | null, actual: Date | null, now: Date) {
  if (!scheduled) return false;
  if (actual) return actual.getTime() > scheduled.getTime();
  return scheduled.getTime() < now.getTime(); // overdue, not yet delivered
}

function levelScore(level: number | null) {
  if (level == null) return null;
  return Math.max(20, 100 - (level - 1) * 20); // L1=100, L2=80, L3=60...
}

export async function getVendorPerformance() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const rows = await prisma.vendorPerformanceEntry.findMany({
    orderBy: [{ rfqCode: "asc" }, { quotedRate: "asc" }],
  });

  const now = new Date();

  // Enrich each row with display escalation info.
  const entries = rows.map((e) => {
    const autoLate = isLate(
      e.scheduledDeliveryDate,
      e.actualDeliveryDate,
      now
    );
    const escalationCount = (autoLate ? 1 : 0) + e.manualEscalationCount;
    const firstEscalationDate =
      e.firstEscalationDate ?? (autoLate ? e.scheduledDeliveryDate : null);
    return { ...e, autoLate, escalationCount, firstEscalationDate };
  });

  // Aggregate per-vendor ratings.
  const byVendor = new Map<string, typeof entries>();
  for (const e of entries) {
    const arr = byVendor.get(e.vendorId) ?? [];
    arr.push(e);
    byVendor.set(e.vendorId, arr);
  }

  const ratings = [...byVendor.entries()].map(([vendorId, es]) => {
    // Quotation timeliness
    const qConsidered = es.filter(
      (e) => e.quoteSubmissionDate && e.submissionDeadline
    );
    const qOnTime = qConsidered.filter(
      (e) =>
        new Date(e.quoteSubmissionDate!).getTime() <=
        new Date(e.submissionDeadline!).getTime()
    ).length;
    const quotation =
      qConsidered.length > 0 ? (qOnTime / qConsidered.length) * 100 : null;

    // Delivery timeliness
    const dConsidered = es.filter(
      (e) =>
        e.scheduledDeliveryDate &&
        (e.actualDeliveryDate ||
          new Date(e.scheduledDeliveryDate).getTime() < now.getTime())
    );
    const dOnTime = dConsidered.filter((e) => !e.autoLate).length;
    const delivery =
      dConsidered.length > 0 ? (dOnTime / dConsidered.length) * 100 : null;

    // Pricing level
    const pScores = es
      .map((e) => levelScore(e.pricingLevel))
      .filter((s): s is number => s != null);
    const pricing =
      pScores.length > 0
        ? pScores.reduce((a, b) => a + b, 0) / pScores.length
        : null;

    // Quality / escalations
    const quality =
      es.length > 0
        ? es.reduce(
            (a, e) => a + Math.max(0, 100 - e.escalationCount * 25),
            0
          ) / es.length
        : null;

    // Weighted overall over present components (renormalised).
    const parts: [number | null, number][] = [
      [delivery, PERFORMANCE_WEIGHTS.delivery],
      [quality, PERFORMANCE_WEIGHTS.quality],
      [pricing, PERFORMANCE_WEIGHTS.pricing],
      [quotation, PERFORMANCE_WEIGHTS.quotation],
    ];
    const present = parts.filter(([v]) => v != null) as [number, number][];
    const wSum = present.reduce((a, [, w]) => a + w, 0);
    const overall =
      wSum > 0
        ? present.reduce((a, [v, w]) => a + v * w, 0) / wSum
        : null;

    return {
      vendorId,
      vendorName: es[0].vendorName,
      entries: es.length,
      quotation,
      delivery,
      pricing,
      quality,
      overall,
    };
  });

  ratings.sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));

  return { entries, ratings, weights: PERFORMANCE_WEIGHTS };
}

export async function getPerformanceVendors() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return prisma.vendor.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

// ============================================================
// MANUAL ENTRY CRUD
// ============================================================

const manualSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  rfqCode: z.string().optional(),
  rfqDate: z.string().optional(),
  submissionDeadline: z.string().optional(),
  quoteSubmissionDate: z.string().optional(),
  quotedRate: z.coerce.number().min(0).optional(),
  productLabel: z.string().optional(),
  pricingLevel: z.coerce.number().int().min(1).optional(),
  scheduledDeliveryDate: z.string().optional(),
  actualDeliveryDate: z.string().optional(),
  modelMake: z.string().optional(),
  firstEscalationDate: z.string().optional(),
  manualEscalationCount: z.coerce.number().int().min(0).optional(),
  remarks: z.string().optional(),
});

const d = (s?: string) => (s ? new Date(s) : null);

export async function createManualEntry(data: z.infer<typeof manualSchema>) {
  await requireManage();
  const p = manualSchema.parse(data);

  const vendor = await prisma.vendor.findUnique({
    where: { id: p.vendorId },
    select: { name: true },
  });
  if (!vendor) throw new Error("Vendor not found");

  await prisma.vendorPerformanceEntry.create({
    data: {
      source: "MANUAL",
      vendorId: p.vendorId,
      vendorName: vendor.name,
      rfqCode: p.rfqCode,
      rfqDate: d(p.rfqDate),
      submissionDeadline: d(p.submissionDeadline),
      quoteSubmissionDate: d(p.quoteSubmissionDate),
      quotedRate: p.quotedRate,
      productLabel: p.productLabel,
      pricingLevel: p.pricingLevel,
      scheduledDeliveryDate: d(p.scheduledDeliveryDate),
      actualDeliveryDate: d(p.actualDeliveryDate),
      modelMake: p.modelMake,
      firstEscalationDate: d(p.firstEscalationDate),
      manualEscalationCount: p.manualEscalationCount ?? 0,
      remarks: p.remarks,
    },
  });

  revalidatePath(PERF_PATH);
}

const editSchema = z.object({
  modelMake: z.string().optional(),
  firstEscalationDate: z.string().optional(),
  manualEscalationCount: z.coerce.number().int().min(0).optional(),
  remarks: z.string().optional(),
});

// Edit the manual fields on any row (auto or manual). Record-derived fields
// on AUTO rows are managed by sync, not here.
export async function updateEntryManualFields(
  id: string,
  data: z.infer<typeof editSchema>
) {
  await requireManage();
  const p = editSchema.parse(data);

  await prisma.vendorPerformanceEntry.update({
    where: { id },
    data: {
      modelMake: p.modelMake,
      firstEscalationDate: d(p.firstEscalationDate),
      manualEscalationCount: p.manualEscalationCount ?? 0,
      remarks: p.remarks,
    },
  });

  revalidatePath(PERF_PATH);
}

export async function deletePerformanceEntry(id: string) {
  await requireManage();
  await prisma.vendorPerformanceEntry.delete({ where: { id } });
  revalidatePath(PERF_PATH);
}
