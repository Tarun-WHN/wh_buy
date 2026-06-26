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

async function requireGrnCreate() {
  const session = await requireAuth();
  if (!hasPermission(session.user.role, PERMISSIONS.GRN_CREATE)) {
    throw new Error("You do not have permission to manage GRNs");
  }
  return session;
}

const GRN_LIST_PATH = "/grn";

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

const grnItemSchema = z.object({
  poLineItemId: z.string().min(1, "PO Line Item is required"),
  orderedQty: z.coerce.number().min(0),
  receivedQty: z.coerce.number().min(0, "Received qty is required"),
  acceptedQty: z.coerce.number().min(0, "Accepted qty is required"),
  rejectedQty: z.coerce.number().min(0).default(0),
  rejectReason: z.string().optional(),
});

const createGrnSchema = z.object({
  deliveryId: z.string().min(1, "Delivery is required"),
  receivedDate: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(grnItemSchema).min(1, "At least one item is required"),
});

// ============================================================
// GET GRNS
// ============================================================

export async function getGrns(params?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;

  const where: Record<string, unknown> = {};

  if (params?.search) {
    where.OR = [
      { number: { contains: params.search } },
    ];
  }

  if (params?.status) {
    where.status = params.status;
  }

  const [grns, total] = await Promise.all([
    prisma.grn.findMany({
      where,
      include: {
        delivery: {
          select: {
            id: true,
            number: true,
            purchaseOrder: {
              select: { id: true, number: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.grn.count({ where }),
  ]);

  return {
    data: grns,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// GET SINGLE GRN
// ============================================================

export async function getGrn(id: string) {
  await requireAuth();

  const grn = await prisma.grn.findUnique({
    where: { id },
    include: {
      delivery: {
        select: {
          id: true,
          number: true,
          purchaseOrderId: true,
          purchaseOrder: {
            select: {
              id: true,
              number: true,
              vendor: { select: { id: true, name: true, code: true } },
            },
          },
        },
      },
      items: {
        include: {
          poLineItem: {
            select: {
              id: true,
              productName: true,
              sku: true,
              uom: true,
              quantity: true,
              unitPrice: true,
            },
          },
        },
      },
      photos: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!grn) {
    throw new Error("GRN not found");
  }

  return grn;
}

// ============================================================
// CREATE GRN
// ============================================================

export async function createGrn(data: z.infer<typeof createGrnSchema>) {
  const session = await requireGrnCreate();
  const parsed = createGrnSchema.parse(data);

  const delivery = await prisma.delivery.findUnique({
    where: { id: parsed.deliveryId },
    include: {
      purchaseOrder: {
        include: { lineItems: true },
      },
    },
  });
  if (!delivery) throw new Error("Delivery not found");

  const seq = await getNextSequence("GRN", "GRN");
  const number = generateNumber("GRN", seq);

  const grn = await prisma.grn.create({
    data: {
      number,
      deliveryId: parsed.deliveryId,
      status: "SUBMITTED",
      receivedDate: parsed.receivedDate
        ? new Date(parsed.receivedDate)
        : new Date(),
      receivedBy: session.user.id,
      remarks: parsed.remarks,
      items: {
        create: parsed.items.map((item) => ({
          poLineItemId: item.poLineItemId,
          orderedQty: item.orderedQty,
          receivedQty: item.receivedQty,
          acceptedQty: item.acceptedQty,
          rejectedQty: item.rejectedQty,
          rejectReason: item.rejectReason,
        })),
      },
    },
  });

  // Update PoLineItem.deliveredQty for each item
  for (const item of parsed.items) {
    await prisma.poLineItem.update({
      where: { id: item.poLineItemId },
      data: {
        deliveredQty: { increment: item.acceptedQty },
      },
    });
  }

  // Check if PO is fully delivered
  const updatedLineItems = await prisma.poLineItem.findMany({
    where: { purchaseOrderId: delivery.purchaseOrderId },
  });

  const allFullyDelivered = updatedLineItems.every(
    (li) => li.deliveredQty >= li.quantity
  );

  if (allFullyDelivered) {
    await prisma.purchaseOrder.update({
      where: { id: delivery.purchaseOrderId },
      data: { status: "FULLY_DELIVERED" },
    });
  } else {
    const anyDelivered = updatedLineItems.some((li) => li.deliveredQty > 0);
    if (anyDelivered) {
      await prisma.purchaseOrder.update({
        where: { id: delivery.purchaseOrderId },
        data: { status: "PARTIALLY_DELIVERED" },
      });
    }
  }

  revalidatePath(GRN_LIST_PATH);
  revalidatePath(`/delivery/${parsed.deliveryId}`);
  revalidatePath(`/purchase-orders/${delivery.purchaseOrderId}`);
  return grn;
}

// ============================================================
// UPLOAD GRN PHOTO
// ============================================================

export async function uploadGrnPhoto(
  grnId: string,
  filePath: string,
  caption?: string
) {
  await requireGrnCreate();

  const grn = await prisma.grn.findUnique({ where: { id: grnId } });
  if (!grn) throw new Error("GRN not found");

  const photo = await prisma.grnPhoto.create({
    data: {
      grnId,
      filePath,
      caption,
    },
  });

  revalidatePath(`/grn/${grnId}`);
  return photo;
}

// ============================================================
// GET DELIVERIES FOR GRN (deliveries that can have a GRN)
// ============================================================

export async function getDeliveriesForGrn() {
  await requireAuth();

  return prisma.delivery.findMany({
    where: {
      status: {
        in: ["DELIVERED", "PARTIALLY_DELIVERED", "IN_TRANSIT", "DISPATCHED"],
      },
    },
    include: {
      purchaseOrder: {
        select: {
          id: true,
          number: true,
          vendor: { select: { id: true, name: true } },
          lineItems: {
            select: {
              id: true,
              productId: true,
              productName: true,
              sku: true,
              uom: true,
              quantity: true,
              unitPrice: true,
              deliveredQty: true,
            },
          },
        },
      },
      _count: { select: { grns: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
