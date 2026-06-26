"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { generateNumber } from "@/lib/utils";

// ============================================================
// HELPERS
// ============================================================

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function getNextSequence(entity: string, prefix: string): Promise<number> {
  const year = new Date().getFullYear();
  const counter = await prisma.sequenceCounter.upsert({
    where: { entity_year: { entity, year } },
    update: { lastValue: { increment: 1 } },
    create: { entity, prefix, year, lastValue: 1 },
  });
  return counter.lastValue;
}

// ============================================================
// SCHEMAS
// ============================================================

const quotationItemSchema = z.object({
  rfqLineItemId: z.string().min(1, "Line item is required"),
  unitPrice: z.coerce.number().min(0, "Unit price is required"),
  quantity: z.coerce.number().min(0.01, "Quantity is required"),
  taxPercent: z.coerce.number().min(0).default(0),
  deliveryDays: z.coerce.number().int().min(0).optional(),
  warranty: z.string().optional(),
  remarks: z.string().optional(),
});

const quotationSchema = z.object({
  rfqId: z.string().min(1, "RFQ is required"),
  vendorId: z.string().min(1, "Vendor is required"),
  validUntil: z.string().optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  warranty: z.string().optional(),
  freight: z.coerce.number().min(0).default(0),
  remarks: z.string().optional(),
  items: z.array(quotationItemSchema).min(1, "At least one item is required"),
});

// ============================================================
// GET QUOTATIONS FOR RFQ
// ============================================================

export async function getQuotations(rfqId: string) {
  await requireAuth();

  return prisma.quotation.findMany({
    where: { rfqId },
    include: {
      vendor: {
        select: { id: true, name: true, code: true, rating: true },
      },
      items: {
        include: {
          rfqLineItem: {
            include: { product: true },
          },
        },
      },
    },
    orderBy: [{ vendorId: "asc" }, { revision: "desc" }],
  });
}

// ============================================================
// GET SINGLE QUOTATION
// ============================================================

export async function getQuotation(id: string) {
  await requireAuth();

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      vendor: {
        select: { id: true, name: true, code: true, rating: true },
      },
      rfq: {
        select: { id: true, number: true, title: true },
      },
      items: {
        include: {
          rfqLineItem: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!quotation) {
    throw new Error("Quotation not found");
  }

  return quotation;
}

// ============================================================
// CREATE QUOTATION
// ============================================================

export async function createQuotation(data: z.infer<typeof quotationSchema>) {
  await requireAuth();
  const parsed = quotationSchema.parse(data);

  // Check if vendor already has a quotation for this RFQ
  const existingCount = await prisma.quotation.count({
    where: { rfqId: parsed.rfqId, vendorId: parsed.vendorId },
  });

  const revision = existingCount + 1;
  const seq = await getNextSequence("QUOTATION", "QOT");
  const number = generateNumber("QOT", seq);

  // Calculate totals
  const items = parsed.items.map((item) => {
    const taxAmount = (item.unitPrice * item.quantity * item.taxPercent) / 100;
    const totalPrice = item.unitPrice * item.quantity + taxAmount;
    return { ...item, taxAmount, totalPrice };
  });

  const totalAmount =
    items.reduce((sum, i) => sum + i.totalPrice, 0) + parsed.freight;

  const quotation = await prisma.quotation.create({
    data: {
      number,
      rfqId: parsed.rfqId,
      vendorId: parsed.vendorId,
      revision,
      status: "RECEIVED",
      validUntil: parsed.validUntil ? new Date(parsed.validUntil) : undefined,
      paymentTerms: parsed.paymentTerms,
      deliveryTerms: parsed.deliveryTerms,
      warranty: parsed.warranty,
      freight: parsed.freight,
      remarks: parsed.remarks,
      totalAmount,
      submittedAt: new Date(),
      items: {
        create: items.map((item) => ({
          rfqLineItemId: item.rfqLineItemId,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          taxPercent: item.taxPercent,
          taxAmount: item.taxAmount,
          totalPrice: item.totalPrice,
          deliveryDays: item.deliveryDays,
          warranty: item.warranty,
          remarks: item.remarks,
        })),
      },
    },
  });

  // Record price history for each item
  for (const item of items) {
    const lineItem = await prisma.rfqLineItem.findUnique({
      where: { id: item.rfqLineItemId },
    });
    if (lineItem) {
      await prisma.priceHistory.create({
        data: {
          productId: lineItem.productId,
          vendorId: parsed.vendorId,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          sourceType: "QUOTATION",
          sourceId: quotation.id,
        },
      });
    }
  }

  // Update RfqVendor status
  await prisma.rfqVendor.updateMany({
    where: { rfqId: parsed.rfqId, vendorId: parsed.vendorId },
    data: { status: "QUOTED" },
  });

  // Check if all vendors have quoted, update RFQ status
  const rfqVendors = await prisma.rfqVendor.findMany({
    where: { rfqId: parsed.rfqId },
  });
  const allQuoted = rfqVendors.every((rv) => rv.status === "QUOTED");
  const someQuoted = rfqVendors.some((rv) => rv.status === "QUOTED");

  if (allQuoted) {
    await prisma.rfq.update({
      where: { id: parsed.rfqId },
      data: { status: "FULLY_RESPONDED" },
    });
  } else if (someQuoted) {
    await prisma.rfq.update({
      where: { id: parsed.rfqId },
      data: { status: "PARTIALLY_RESPONDED" },
    });
  }

  revalidatePath(`/rfq/${parsed.rfqId}`);
  return quotation;
}

// ============================================================
// REVISE QUOTATION
// ============================================================

export async function reviseQuotation(
  id: string,
  data: Omit<z.infer<typeof quotationSchema>, "rfqId" | "vendorId">
) {
  await requireAuth();

  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) throw new Error("Quotation not found");

  // Create a new quotation as a revision
  const fullData = {
    ...data,
    rfqId: existing.rfqId,
    vendorId: existing.vendorId,
  };

  return createQuotation(fullData);
}

// ============================================================
// ACCEPT QUOTATION
// ============================================================

export async function acceptQuotation(id: string) {
  await requireAuth();

  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) throw new Error("Quotation not found");

  const quotation = await prisma.quotation.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  // Reject all other quotations for this RFQ
  await prisma.quotation.updateMany({
    where: {
      rfqId: existing.rfqId,
      id: { not: id },
      status: { not: "REJECTED" },
    },
    data: { status: "REJECTED" },
  });

  revalidatePath(`/rfq/${existing.rfqId}`);
  return quotation;
}

// ============================================================
// REJECT QUOTATION
// ============================================================

export async function rejectQuotation(id: string) {
  await requireAuth();

  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) throw new Error("Quotation not found");

  const quotation = await prisma.quotation.update({
    where: { id },
    data: { status: "REJECTED" },
  });

  revalidatePath(`/rfq/${existing.rfqId}`);
  return quotation;
}
