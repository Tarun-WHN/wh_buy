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

async function requireDeliveryManage() {
  const session = await requireAuth();
  if (!hasPermission(session.user.role, PERMISSIONS.DELIVERY_MANAGE)) {
    throw new Error("You do not have permission to manage deliveries");
  }
  return session;
}

const DELIVERY_LIST_PATH = "/delivery";

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

const createDeliverySchema = z.object({
  purchaseOrderId: z.string().min(1, "Purchase Order is required"),
  vehicleNumber: z.string().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  lrNumber: z.string().optional(),
  ewayBillNumber: z.string().optional(),
  dispatchDate: z.string().optional(),
  expectedDate: z.string().optional(),
  remarks: z.string().optional(),
});

const updateDeliverySchema = z.object({
  vehicleNumber: z.string().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  lrNumber: z.string().optional(),
  ewayBillNumber: z.string().optional(),
  dispatchDate: z.string().optional(),
  expectedDate: z.string().optional(),
  remarks: z.string().optional(),
});

// ============================================================
// GET DELIVERIES
// ============================================================

export async function getDeliveries(params?: {
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

  const [deliveries, total] = await Promise.all([
    prisma.delivery.findMany({
      where,
      include: {
        purchaseOrder: {
          select: { id: true, number: true, status: true, totalAmount: true },
        },
        vendor: { select: { id: true, name: true, code: true } },
        _count: { select: { grns: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.delivery.count({ where }),
  ]);

  return {
    data: deliveries,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// GET SINGLE DELIVERY
// ============================================================

export async function getDelivery(id: string) {
  await requireAuth();

  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      purchaseOrder: {
        select: {
          id: true,
          number: true,
          status: true,
          totalAmount: true,
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
      vendor: {
        select: {
          id: true,
          name: true,
          code: true,
          email: true,
          phone: true,
          contactPerson: true,
        },
      },
      grns: {
        select: {
          id: true,
          number: true,
          status: true,
          receivedDate: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!delivery) {
    throw new Error("Delivery not found");
  }

  return delivery;
}

// ============================================================
// CREATE DELIVERY
// ============================================================

export async function createDelivery(data: z.infer<typeof createDeliverySchema>) {
  await requireDeliveryManage();
  const parsed = createDeliverySchema.parse(data);

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: parsed.purchaseOrderId },
  });
  if (!po) throw new Error("Purchase Order not found");

  const seq = await getNextSequence("DELIVERY", "DEL");
  const number = generateNumber("DEL", seq);

  const delivery = await prisma.delivery.create({
    data: {
      number,
      purchaseOrderId: parsed.purchaseOrderId,
      vendorId: po.vendorId,
      status: "SCHEDULED",
      vehicleNumber: parsed.vehicleNumber,
      driverName: parsed.driverName,
      driverPhone: parsed.driverPhone,
      lrNumber: parsed.lrNumber,
      ewayBillNumber: parsed.ewayBillNumber,
      dispatchDate: parsed.dispatchDate ? new Date(parsed.dispatchDate) : undefined,
      expectedDate: parsed.expectedDate ? new Date(parsed.expectedDate) : undefined,
      remarks: parsed.remarks,
    },
  });

  revalidatePath(DELIVERY_LIST_PATH);
  revalidatePath(`/purchase-orders/${parsed.purchaseOrderId}`);
  return delivery;
}

// ============================================================
// UPDATE DELIVERY
// ============================================================

export async function updateDelivery(
  id: string,
  data: z.infer<typeof updateDeliverySchema>
) {
  await requireDeliveryManage();
  const parsed = updateDeliverySchema.parse(data);

  const existing = await prisma.delivery.findUnique({ where: { id } });
  if (!existing) throw new Error("Delivery not found");

  const delivery = await prisma.delivery.update({
    where: { id },
    data: {
      vehicleNumber: parsed.vehicleNumber,
      driverName: parsed.driverName,
      driverPhone: parsed.driverPhone,
      lrNumber: parsed.lrNumber,
      ewayBillNumber: parsed.ewayBillNumber,
      dispatchDate: parsed.dispatchDate ? new Date(parsed.dispatchDate) : undefined,
      expectedDate: parsed.expectedDate ? new Date(parsed.expectedDate) : undefined,
      remarks: parsed.remarks,
    },
  });

  revalidatePath(DELIVERY_LIST_PATH);
  revalidatePath(`/delivery/${id}`);
  return delivery;
}

// ============================================================
// UPDATE DELIVERY STATUS
// ============================================================

export async function updateDeliveryStatus(
  id: string,
  status: string
) {
  await requireDeliveryManage();

  const validStatuses = [
    "SCHEDULED",
    "DISPATCHED",
    "IN_TRANSIT",
    "DELIVERED",
    "PARTIALLY_DELIVERED",
    "REJECTED",
    "CANCELLED",
  ];

  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const existing = await prisma.delivery.findUnique({ where: { id } });
  if (!existing) throw new Error("Delivery not found");

  const updateData: Record<string, unknown> = { status };

  if (status === "DELIVERED" || status === "PARTIALLY_DELIVERED") {
    updateData.deliveredDate = new Date();
  }

  const delivery = await prisma.delivery.update({
    where: { id },
    data: updateData,
  });

  // Update PO status if delivery is delivered
  if (status === "DELIVERED" || status === "PARTIALLY_DELIVERED") {
    const allDeliveries = await prisma.delivery.findMany({
      where: { purchaseOrderId: existing.purchaseOrderId },
    });
    const allDelivered = allDeliveries.every(
      (d) => d.status === "DELIVERED"
    );
    await prisma.purchaseOrder.update({
      where: { id: existing.purchaseOrderId },
      data: {
        status: allDelivered ? "FULLY_DELIVERED" : "PARTIALLY_DELIVERED",
      },
    });
    revalidatePath(`/purchase-orders/${existing.purchaseOrderId}`);
  }

  revalidatePath(DELIVERY_LIST_PATH);
  revalidatePath(`/delivery/${id}`);
  return delivery;
}

// ============================================================
// GET POs FOR DELIVERY (accepted POs with remaining qty)
// ============================================================

export async function getPosForDelivery() {
  await requireAuth();

  return prisma.purchaseOrder.findMany({
    where: {
      deletedAt: null,
      status: {
        in: ["ACKNOWLEDGED", "PARTIALLY_DELIVERED"],
      },
    },
    select: {
      id: true,
      number: true,
      vendor: { select: { id: true, name: true } },
      totalAmount: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
