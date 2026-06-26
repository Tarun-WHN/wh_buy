"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { generateNumber } from "@/lib/utils";
import { createApprovalChain } from "./approval.actions";

// ============================================================
// HELPERS
// ============================================================

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function requirePoCreate() {
  const session = await requireAuth();
  if (!hasPermission(session.user.role, PERMISSIONS.PO_CREATE)) {
    throw new Error("You do not have permission to manage Purchase Orders");
  }
  return session;
}

const PO_LIST_PATH = "/purchase-orders";

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

const poLineItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  productName: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  uom: z.string().min(1, "UOM is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price is required"),
  taxPercent: z.coerce.number().min(0).default(0),
  remarks: z.string().optional(),
});

const poSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  rfqId: z.string().optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  deliveryDate: z.string().optional(),
  shippingAddress: z.string().optional(),
  freightAmount: z.coerce.number().min(0).default(0),
  remarks: z.string().optional(),
  lineItems: z.array(poLineItemSchema).min(1, "At least one line item is required"),
});

// ============================================================
// GET PURCHASE ORDERS
// ============================================================

export async function getPurchaseOrders(params?: {
  search?: string;
  status?: string;
  vendorId?: string;
  warehouseId?: string;
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
      { number: { contains: params.search } },
    ];
  }

  if (params?.status) {
    where.status = params.status;
  }

  if (params?.vendorId) {
    where.vendorId = params.vendorId;
  }

  if (params?.warehouseId) {
    where.warehouseId = params.warehouseId;
  }

  const [purchaseOrders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { lineItems: true, deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    data: purchaseOrders,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// GET SINGLE PURCHASE ORDER
// ============================================================

export async function getPurchaseOrder(id: string) {
  await requireAuth();

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          code: true,
          email: true,
          phone: true,
          contactPerson: true,
          address: true,
          gstNumber: true,
        },
      },
      warehouse: {
        select: { id: true, name: true, code: true, address: true },
      },
      createdBy: { select: { id: true, name: true } },
      lineItems: {
        orderBy: { createdAt: "asc" },
      },
      approvals: {
        include: {
          actions: {
            include: {
              actionBy: { select: { id: true, name: true } },
            },
            orderBy: { actionAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      versions: {
        orderBy: { version: "desc" },
      },
      deliveries: {
        select: {
          id: true,
          number: true,
          status: true,
          expectedDate: true,
          deliveredDate: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!po || po.deletedAt) {
    throw new Error("Purchase Order not found");
  }

  return po;
}

// ============================================================
// CREATE PURCHASE ORDER
// ============================================================

export async function createPurchaseOrder(data: z.infer<typeof poSchema>) {
  const session = await requirePoCreate();
  const parsed = poSchema.parse(data);

  const seq = await getNextSequence("PO", "PO");
  const number = generateNumber("PO", seq);

  // Calculate totals
  const lineItems = parsed.lineItems.map((item) => {
    const taxAmount = (item.unitPrice * item.quantity * item.taxPercent) / 100;
    const totalPrice = item.unitPrice * item.quantity + taxAmount;
    return { ...item, taxAmount, totalPrice };
  });

  const subtotal = lineItems.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );
  const taxAmount = lineItems.reduce((sum, i) => sum + i.taxAmount, 0);
  const totalAmount = subtotal + taxAmount + parsed.freightAmount;

  const po = await prisma.purchaseOrder.create({
    data: {
      number,
      vendorId: parsed.vendorId,
      warehouseId: parsed.warehouseId,
      rfqId: parsed.rfqId || undefined,
      status: "DRAFT",
      revision: 1,
      paymentTerms: parsed.paymentTerms,
      deliveryTerms: parsed.deliveryTerms,
      deliveryDate: parsed.deliveryDate
        ? new Date(parsed.deliveryDate)
        : undefined,
      shippingAddress: parsed.shippingAddress,
      subtotal,
      taxAmount,
      freightAmount: parsed.freightAmount,
      totalAmount,
      remarks: parsed.remarks,
      createdById: session.user.id,
      lineItems: {
        create: lineItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          uom: item.uom,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxPercent: item.taxPercent,
          taxAmount: item.taxAmount,
          totalPrice: item.totalPrice,
          remarks: item.remarks,
        })),
      },
    },
  });

  revalidatePath(PO_LIST_PATH);
  return po;
}

// ============================================================
// UPDATE PURCHASE ORDER
// ============================================================

export async function updatePurchaseOrder(
  id: string,
  data: z.infer<typeof poSchema>
) {
  await requirePoCreate();
  const parsed = poSchema.parse(data);

  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Purchase Order not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft purchase orders can be updated");
  }

  // Delete existing line items and recreate
  await prisma.poLineItem.deleteMany({ where: { purchaseOrderId: id } });

  // Calculate totals
  const lineItems = parsed.lineItems.map((item) => {
    const taxAmount = (item.unitPrice * item.quantity * item.taxPercent) / 100;
    const totalPrice = item.unitPrice * item.quantity + taxAmount;
    return { ...item, taxAmount, totalPrice };
  });

  const subtotal = lineItems.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );
  const taxAmount = lineItems.reduce((sum, i) => sum + i.taxAmount, 0);
  const totalAmount = subtotal + taxAmount + parsed.freightAmount;

  const po = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      vendorId: parsed.vendorId,
      warehouseId: parsed.warehouseId,
      rfqId: parsed.rfqId || undefined,
      paymentTerms: parsed.paymentTerms,
      deliveryTerms: parsed.deliveryTerms,
      deliveryDate: parsed.deliveryDate
        ? new Date(parsed.deliveryDate)
        : undefined,
      shippingAddress: parsed.shippingAddress,
      subtotal,
      taxAmount,
      freightAmount: parsed.freightAmount,
      totalAmount,
      remarks: parsed.remarks,
      lineItems: {
        create: lineItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          uom: item.uom,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxPercent: item.taxPercent,
          taxAmount: item.taxAmount,
          totalPrice: item.totalPrice,
          remarks: item.remarks,
        })),
      },
    },
  });

  revalidatePath(PO_LIST_PATH);
  revalidatePath(`/purchase-orders/${id}`);
  return po;
}

// ============================================================
// SUBMIT FOR APPROVAL
// ============================================================

export async function submitForApproval(id: string) {
  await requirePoCreate();

  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Purchase Order not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft purchase orders can be submitted for approval");
  }

  // Create approval chain
  await createApprovalChain(
    "PURCHASE_ORDER",
    id,
    existing.totalAmount
  );

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "PENDING_APPROVAL" },
  });

  revalidatePath(PO_LIST_PATH);
  revalidatePath(`/purchase-orders/${id}`);
  revalidatePath("/approvals");
}

// ============================================================
// SEND TO VENDOR
// ============================================================

export async function sendToVendor(id: string) {
  await requirePoCreate();

  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Purchase Order not found");
  if (existing.status !== "APPROVED") {
    throw new Error("Only approved purchase orders can be sent to vendors");
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "SENT" },
  });

  revalidatePath(PO_LIST_PATH);
  revalidatePath(`/purchase-orders/${id}`);
}

// ============================================================
// REVISE PURCHASE ORDER
// ============================================================

export async function revisePurchaseOrder(
  id: string,
  data: z.infer<typeof poSchema>
) {
  const session = await requirePoCreate();
  const parsed = poSchema.parse(data);

  const existing = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { lineItems: true },
  });
  if (!existing) throw new Error("Purchase Order not found");

  // Save current version as a snapshot
  await prisma.poVersion.create({
    data: {
      purchaseOrderId: id,
      version: existing.revision,
      snapshot: JSON.stringify({
        vendorId: existing.vendorId,
        warehouseId: existing.warehouseId,
        paymentTerms: existing.paymentTerms,
        deliveryTerms: existing.deliveryTerms,
        subtotal: existing.subtotal,
        taxAmount: existing.taxAmount,
        freightAmount: existing.freightAmount,
        totalAmount: existing.totalAmount,
        lineItems: existing.lineItems,
      }),
      changedBy: session.user.id,
      changeReason: "Revised",
    },
  });

  // Delete existing line items
  await prisma.poLineItem.deleteMany({ where: { purchaseOrderId: id } });

  // Calculate totals
  const lineItems = parsed.lineItems.map((item) => {
    const taxAmount = (item.unitPrice * item.quantity * item.taxPercent) / 100;
    const totalPrice = item.unitPrice * item.quantity + taxAmount;
    return { ...item, taxAmount, totalPrice };
  });

  const subtotal = lineItems.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );
  const taxAmount = lineItems.reduce((sum, i) => sum + i.taxAmount, 0);
  const totalAmount = subtotal + taxAmount + parsed.freightAmount;

  const po = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      vendorId: parsed.vendorId,
      warehouseId: parsed.warehouseId,
      revision: existing.revision + 1,
      status: "DRAFT",
      paymentTerms: parsed.paymentTerms,
      deliveryTerms: parsed.deliveryTerms,
      deliveryDate: parsed.deliveryDate
        ? new Date(parsed.deliveryDate)
        : undefined,
      shippingAddress: parsed.shippingAddress,
      subtotal,
      taxAmount,
      freightAmount: parsed.freightAmount,
      totalAmount,
      remarks: parsed.remarks,
      lineItems: {
        create: lineItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          uom: item.uom,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxPercent: item.taxPercent,
          taxAmount: item.taxAmount,
          totalPrice: item.totalPrice,
          remarks: item.remarks,
        })),
      },
    },
  });

  revalidatePath(PO_LIST_PATH);
  revalidatePath(`/purchase-orders/${id}`);
  return po;
}

// ============================================================
// DELETE PURCHASE ORDER
// ============================================================

export async function deletePurchaseOrder(id: string) {
  await requirePoCreate();

  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("Purchase Order not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft purchase orders can be deleted");
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath(PO_LIST_PATH);
}

// ============================================================
// VENDOR: ACCEPT PO
// ============================================================

export async function vendorAcceptPo(id: string) {
  const session = await requireAuth();
  if (session.user.role !== "VENDOR" || !session.user.vendorId) {
    throw new Error("Only vendors can accept purchase orders");
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error("Purchase Order not found");
  if (po.vendorId !== session.user.vendorId) {
    throw new Error("This PO does not belong to your vendor account");
  }
  if (po.status !== "SENT") {
    throw new Error("Only sent purchase orders can be accepted");
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: "ACKNOWLEDGED",
      vendorAcceptedAt: new Date(),
    },
  });

  revalidatePath(`/vendor-portal/orders/${id}`);
  revalidatePath(`/purchase-orders/${id}`);
  revalidatePath(PO_LIST_PATH);
}

// ============================================================
// VENDOR: REJECT PO
// ============================================================

export async function vendorRejectPo(id: string, reason: string) {
  const session = await requireAuth();
  if (session.user.role !== "VENDOR" || !session.user.vendorId) {
    throw new Error("Only vendors can reject purchase orders");
  }

  if (!reason) throw new Error("Rejection reason is required");

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new Error("Purchase Order not found");
  if (po.vendorId !== session.user.vendorId) {
    throw new Error("This PO does not belong to your vendor account");
  }
  if (po.status !== "SENT") {
    throw new Error("Only sent purchase orders can be rejected");
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: "CANCELLED",
      vendorRejectedAt: new Date(),
      vendorRejectReason: reason,
    },
  });

  revalidatePath(`/vendor-portal/orders/${id}`);
  revalidatePath(`/purchase-orders/${id}`);
  revalidatePath(PO_LIST_PATH);
}

// ============================================================
// GET VENDORS FOR PO FORM
// ============================================================

export async function getVendorsForPo() {
  await requireAuth();

  return prisma.vendor.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      registrationStatus: "APPROVED",
    },
    select: {
      id: true,
      name: true,
      code: true,
      email: true,
      paymentTerms: true,
    },
    orderBy: { name: "asc" },
  });
}

// ============================================================
// GET RFQ DATA FOR PO PREFILL
// ============================================================

export async function getRfqForPoPrefill(rfqId: string, vendorId: string) {
  await requireAuth();

  const quotation = await prisma.quotation.findFirst({
    where: {
      rfqId,
      vendorId,
      status: "APPROVED",
    },
    include: {
      items: {
        include: {
          rfqLineItem: {
            include: { product: true },
          },
        },
      },
      rfq: {
        select: {
          deliveryLocation: true,
          termsConditions: true,
        },
      },
    },
    orderBy: { revision: "desc" },
  });

  return quotation;
}
