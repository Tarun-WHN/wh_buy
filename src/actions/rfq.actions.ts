"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { generateNumber } from "@/lib/utils";

// ============================================================
// HELPERS
// ============================================================

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function requireRfqCreate() {
  const session = await requireAuth();
  if (!hasPermission(session.user.role, PERMISSIONS.RFQ_CREATE)) {
    throw new Error("You do not have permission to manage RFQs");
  }
  return session;
}

const RFQ_LIST_PATH = "/rfq";

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

const rfqLineItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  specifications: z.string().optional(),
  targetPrice: z.coerce.number().min(0).optional(),
});

const rfqSchema = z.object({
  title: z.string().min(1, "Title is required"),
  rfqType: z.string().default("SINGLE"),
  submissionDeadline: z.string().optional(),
  termsConditions: z.string().optional(),
  deliveryLocation: z.string().optional(),
  requirementId: z.string().optional(),
  lineItems: z.array(rfqLineItemSchema).min(1, "At least one line item is required"),
  vendorIds: z.array(z.string()).min(1, "At least one vendor is required"),
});

// ============================================================
// GET RFQS
// ============================================================

export async function getRfqs(params?: {
  search?: string;
  status?: string;
  rfqType?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;

  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (params?.search) {
    where.OR = [
      { title: { contains: params.search } },
      { number: { contains: params.search } },
    ];
  }

  if (params?.status) {
    where.status = params.status;
  }

  if (params?.rfqType) {
    where.rfqType = params.rfqType;
  }

  const [rfqs, total] = await Promise.all([
    prisma.rfq.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { lineItems: true, rfqVendors: true, quotations: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.rfq.count({ where }),
  ]);

  return {
    data: rfqs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// GET SINGLE RFQ
// ============================================================

export async function getRfq(id: string) {
  await requireAuth();

  const rfq = await prisma.rfq.findUnique({
    where: { id },
    include: {
      requirement: { select: { id: true, number: true, title: true } },
      createdBy: { select: { id: true, name: true } },
      lineItems: {
        include: {
          product: true,
        },
      },
      rfqVendors: {
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              code: true,
              email: true,
              phone: true,
              rating: true,
            },
          },
        },
      },
      quotations: {
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
      },
    },
  });

  if (!rfq || rfq.deletedAt) {
    throw new Error("RFQ not found");
  }

  return rfq;
}

// ============================================================
// RECORD A VENDOR QUOTE (buyer captures vendor's quote + attachment)
// ============================================================

const recordQuoteSchema = z.object({
  rfqId: z.string().min(1),
  vendorId: z.string().min(1),
  freight: z.coerce.number().min(0).default(0),
  remarks: z.string().optional(),
  filePath: z.string().optional(),
  fileName: z.string().optional(),
  items: z
    .array(
      z.object({
        rfqLineItemId: z.string().min(1),
        unitPrice: z.coerce.number().min(0),
        taxPercent: z.coerce.number().min(0).default(0),
      })
    )
    .min(1, "At least one line price is required"),
});

export async function recordVendorQuote(data: z.infer<typeof recordQuoteSchema>) {
  await requireRfqCreate();
  const p = recordQuoteSchema.parse(data);

  const lineItems = await prisma.rfqLineItem.findMany({
    where: { rfqId: p.rfqId },
    select: { id: true, quantity: true },
  });
  const qtyMap = new Map(lineItems.map((li) => [li.id, li.quantity]));

  let subtotal = 0;
  let taxTotal = 0;
  const itemsData = p.items
    .filter((it) => qtyMap.has(it.rfqLineItemId) && it.unitPrice > 0)
    .map((it) => {
      const qty = qtyMap.get(it.rfqLineItemId)!;
      const line = it.unitPrice * qty;
      const tax = line * (it.taxPercent / 100);
      subtotal += line;
      taxTotal += tax;
      return {
        rfqLineItemId: it.rfqLineItemId,
        unitPrice: it.unitPrice,
        quantity: qty,
        taxPercent: it.taxPercent,
        taxAmount: tax,
        totalPrice: line + tax,
      };
    });
  if (itemsData.length === 0) throw new Error("Enter a price for at least one item");

  const totalAmount = subtotal + taxTotal + p.freight;
  const existing = await prisma.quotation.findFirst({
    where: { rfqId: p.rfqId, vendorId: p.vendorId },
    orderBy: { revision: "desc" },
  });
  const revision = existing ? existing.revision + 1 : 1;
  const seq = await getNextSequence("QT", "QT");

  await prisma.quotation.create({
    data: {
      number: generateNumber("QT", seq),
      rfqId: p.rfqId,
      vendorId: p.vendorId,
      revision,
      status: "SUBMITTED",
      freight: p.freight,
      remarks: p.remarks,
      filePath: p.filePath,
      fileName: p.fileName,
      totalAmount,
      submittedAt: new Date(),
      items: { create: itemsData },
    },
  });

  await prisma.rfqVendor.updateMany({
    where: { rfqId: p.rfqId, vendorId: p.vendorId },
    data: { status: "RESPONDED" },
  });

  revalidatePath(`/rfq/${p.rfqId}/compare`);
  revalidatePath(`/rfq/${p.rfqId}`);
}

// ============================================================
// AWARD A QUOTATION (select vendor with remarks)
// ============================================================

export async function awardQuotation(
  rfqId: string,
  quotationId: string,
  remarks: string
) {
  await requireRfqCreate();
  const q = await prisma.quotation.findUnique({ where: { id: quotationId } });
  if (!q || q.rfqId !== rfqId) throw new Error("Quotation not found for this RFQ");

  await prisma.rfq.update({
    where: { id: rfqId },
    data: {
      awardedQuotationId: quotationId,
      selectionRemarks: remarks || null,
      status: "AWARDED",
    },
  });
  await prisma.quotation.update({
    where: { id: quotationId },
    data: { status: "AWARDED" },
  });

  revalidatePath(`/rfq/${rfqId}/compare`);
  revalidatePath(`/rfq/${rfqId}`);
  return { vendorId: q.vendorId };
}

// ============================================================
// CREATE RFQ
// ============================================================

export async function createRfq(data: z.infer<typeof rfqSchema>) {
  const session = await requireRfqCreate();
  const parsed = rfqSchema.parse(data);

  const seq = await getNextSequence("RFQ", "RFQ");
  const number = generateNumber("RFQ", seq);

  const rfq = await prisma.rfq.create({
    data: {
      number,
      title: parsed.title,
      rfqType: parsed.rfqType,
      submissionDeadline: parsed.submissionDeadline
        ? new Date(parsed.submissionDeadline)
        : undefined,
      termsConditions: parsed.termsConditions,
      deliveryLocation: parsed.deliveryLocation,
      requirementId: parsed.requirementId || undefined,
      status: "DRAFT",
      createdById: session.user.id,
      lineItems: {
        create: parsed.lineItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          specifications: item.specifications,
          targetPrice: item.targetPrice,
        })),
      },
      rfqVendors: {
        create: parsed.vendorIds.map((vendorId) => ({
          vendorId,
          status: "PENDING",
        })),
      },
    },
  });

  // If linked to a requirement, mark it as CONVERTED
  if (parsed.requirementId) {
    await prisma.requirement.update({
      where: { id: parsed.requirementId },
      data: { status: "CONVERTED" },
    });
    revalidatePath("/requirements");
  }

  revalidatePath(RFQ_LIST_PATH);
  return rfq;
}

// ============================================================
// UPDATE RFQ
// ============================================================

export async function updateRfq(id: string, data: z.infer<typeof rfqSchema>) {
  await requireRfqCreate();
  const parsed = rfqSchema.parse(data);

  const existing = await prisma.rfq.findUnique({ where: { id } });
  if (!existing) throw new Error("RFQ not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft RFQs can be updated");
  }

  // Delete existing line items and vendors, recreate
  await prisma.rfqLineItem.deleteMany({ where: { rfqId: id } });
  await prisma.rfqVendor.deleteMany({ where: { rfqId: id } });

  const rfq = await prisma.rfq.update({
    where: { id },
    data: {
      title: parsed.title,
      rfqType: parsed.rfqType,
      submissionDeadline: parsed.submissionDeadline
        ? new Date(parsed.submissionDeadline)
        : undefined,
      termsConditions: parsed.termsConditions,
      deliveryLocation: parsed.deliveryLocation,
      requirementId: parsed.requirementId || undefined,
      lineItems: {
        create: parsed.lineItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          specifications: item.specifications,
          targetPrice: item.targetPrice,
        })),
      },
      rfqVendors: {
        create: parsed.vendorIds.map((vendorId) => ({
          vendorId,
          status: "PENDING",
        })),
      },
    },
  });

  revalidatePath(RFQ_LIST_PATH);
  revalidatePath(`/rfq/${id}`);
  return rfq;
}

// ============================================================
// PUBLISH RFQ
// ============================================================

export async function publishRfq(id: string) {
  await requireRfqCreate();

  const existing = await prisma.rfq.findUnique({ where: { id } });
  if (!existing) throw new Error("RFQ not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft RFQs can be published");
  }

  await prisma.$transaction([
    prisma.rfq.update({
      where: { id },
      data: { status: "SENT" },
    }),
    prisma.rfqVendor.updateMany({
      where: { rfqId: id },
      data: { status: "DISPATCHED", dispatchedAt: new Date() },
    }),
  ]);

  revalidatePath(RFQ_LIST_PATH);
  revalidatePath(`/rfq/${id}`);
}

// ============================================================
// CLOSE RFQ
// ============================================================

export async function closeRfq(id: string) {
  await requireRfqCreate();

  const existing = await prisma.rfq.findUnique({ where: { id } });
  if (!existing) throw new Error("RFQ not found");
  if (existing.status === "CLOSED" || existing.status === "CANCELLED") {
    throw new Error("RFQ is already closed or cancelled");
  }

  await prisma.rfq.update({
    where: { id },
    data: { status: "CLOSED" },
  });

  revalidatePath(RFQ_LIST_PATH);
  revalidatePath(`/rfq/${id}`);
}

// ============================================================
// DELETE RFQ
// ============================================================

export async function deleteRfq(id: string) {
  await requireRfqCreate();

  const existing = await prisma.rfq.findUnique({ where: { id } });
  if (!existing) throw new Error("RFQ not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft RFQs can be deleted");
  }

  await prisma.rfq.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath(RFQ_LIST_PATH);
}

// ============================================================
// GET APPROVED VENDORS (helper for forms)
// ============================================================

export async function getApprovedVendors(categoryId?: string) {
  await requireAuth();

  const where: Record<string, unknown> = {
    deletedAt: null,
    isActive: true,
    registrationStatus: "APPROVED",
  };

  if (categoryId) {
    where.vendorCategories = {
      some: { categoryId },
    };
  }

  return prisma.vendor.findMany({
    where,
    select: {
      id: true,
      name: true,
      code: true,
      email: true,
      rating: true,
      vendorCategories: {
        include: { category: true },
      },
    },
    orderBy: { name: "asc" },
  });
}

// ============================================================
// GET APPROVED REQUIREMENTS (helper for RFQ creation)
// ============================================================

export async function getApprovedRequirements() {
  await requireAuth();

  return prisma.requirement.findMany({
    where: {
      deletedAt: null,
      status: "APPROVED",
    },
    include: {
      items: {
        include: { product: true },
      },
      warehouse: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
