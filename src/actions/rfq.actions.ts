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
