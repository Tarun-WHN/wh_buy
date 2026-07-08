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

async function requireInvoiceManage() {
  const session = await requireAuth();
  if (!hasPermission(session.user.role, PERMISSIONS.INVOICE_MANAGE)) {
    throw new Error("You do not have permission to manage invoices");
  }
  return session;
}

const INVOICE_LIST_PATH = "/invoices";

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

const createInvoiceSchema = z.object({
  purchaseOrderId: z.string().min(1, "Purchase Order is required"),
  vendorInvoiceNo: z.string().min(1, "Vendor Invoice Number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().optional(),
  subtotal: z.coerce.number().min(0, "Subtotal is required"),
  taxAmount: z.coerce.number().min(0).default(0),
  totalAmount: z.coerce.number().min(0, "Total amount is required"),
  filePath: z.string().optional(),
});

// ============================================================
// GET INVOICES
// ============================================================

export async function getInvoices(params?: {
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
      { vendorInvoiceNo: { contains: params.search } },
    ];
  }

  if (params?.status) {
    where.status = params.status;
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        purchaseOrder: {
          select: { id: true, number: true },
        },
        vendor: { select: { id: true, name: true, code: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    data: invoices,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// GET SINGLE INVOICE
// ============================================================

export async function getInvoice(id: string) {
  await requireAuth();

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      purchaseOrder: {
        select: {
          id: true,
          number: true,
          subtotal: true,
          taxAmount: true,
          totalAmount: true,
          vendor: {
            select: {
              id: true,
              name: true,
              code: true,
              email: true,
              phone: true,
              contactPerson: true,
              gstNumber: true,
            },
          },
          lineItems: {
            select: {
              id: true,
              productName: true,
              sku: true,
              quantity: true,
              unitPrice: true,
              taxAmount: true,
              totalPrice: true,
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
          gstNumber: true,
        },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  return invoice;
}

// ============================================================
// CREATE INVOICE
// ============================================================

export async function createInvoice(data: z.infer<typeof createInvoiceSchema>) {
  await requireInvoiceManage();
  const parsed = createInvoiceSchema.parse(data);

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: parsed.purchaseOrderId },
  });
  if (!po) throw new Error("Purchase Order not found");

  const seq = await getNextSequence("INVOICE", "INV");
  const number = generateNumber("INV", seq);

  const invoice = await prisma.invoice.create({
    data: {
      number,
      vendorInvoiceNo: parsed.vendorInvoiceNo,
      purchaseOrderId: parsed.purchaseOrderId,
      vendorId: po.vendorId,
      invoiceDate: new Date(parsed.invoiceDate),
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
      subtotal: parsed.subtotal,
      taxAmount: parsed.taxAmount,
      totalAmount: parsed.totalAmount,
      status: "PENDING",
      filePath: parsed.filePath,
    },
  });

  // Auto-run 3-way match
  await performThreeWayMatch(invoice.id);

  revalidatePath(INVOICE_LIST_PATH);
  return invoice;
}

// ============================================================
// UPLOAD INVOICE DOCUMENT
// ============================================================

export async function uploadInvoice(
  invoiceId: string,
  filePath: string,
  fileName?: string
) {
  await requireInvoiceManage();

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found");

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { filePath, fileName },
  });

  revalidatePath(`/invoices/${invoiceId}`);
}

// Record a deduction (short payment) against the vendor's invoice with a reason.
export async function setInvoiceDeduction(
  invoiceId: string,
  deductionAmount: number,
  deductionReason: string
) {
  await requireInvoiceManage();
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found");
  if (deductionAmount < 0) throw new Error("Deduction cannot be negative");
  if (deductionAmount > invoice.totalAmount)
    throw new Error("Deduction cannot exceed the invoice total");

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      deductionAmount,
      deductionReason: deductionReason || null,
    },
  });
  revalidatePath(`/invoices/${invoiceId}`);
}

// ============================================================
// 3-WAY MATCH
// ============================================================

export async function performThreeWayMatch(invoiceId: string) {
  await requireAuth();

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      purchaseOrder: {
        include: {
          lineItems: true,
          deliveries: {
            include: {
              grns: {
                include: { items: true },
              },
            },
          },
        },
      },
    },
  });

  if (!invoice) throw new Error("Invoice not found");

  const po = invoice.purchaseOrder;
  const poAmount = po.totalAmount;

  // Calculate GRN value (sum of accepted qty * unit price for all GRN items)
  let grnValue = 0;
  for (const delivery of po.deliveries) {
    for (const grn of delivery.grns) {
      for (const grnItem of grn.items) {
        const poLineItem = po.lineItems.find(
          (li) => li.id === grnItem.poLineItemId
        );
        if (poLineItem) {
          grnValue += grnItem.acceptedQty * poLineItem.unitPrice;
        }
      }
    }
  }

  // Add tax proportionally
  if (po.subtotal > 0) {
    const taxRatio = po.taxAmount / po.subtotal;
    grnValue = grnValue + grnValue * taxRatio;
  }

  const invoiceAmount = invoice.totalAmount;

  // Compare with 2% tolerance
  const tolerance = 0.02;
  const poMatch =
    Math.abs(poAmount - invoiceAmount) / Math.max(poAmount, 1) <= tolerance;
  const grnMatch =
    Math.abs(grnValue - invoiceAmount) / Math.max(grnValue, 1) <= tolerance;

  const remarks: string[] = [];
  if (!poMatch) {
    remarks.push(
      `PO amount (${poAmount.toFixed(2)}) differs from Invoice amount (${invoiceAmount.toFixed(2)}) by more than 2%`
    );
  }
  if (!grnMatch) {
    remarks.push(
      `GRN value (${grnValue.toFixed(2)}) differs from Invoice amount (${invoiceAmount.toFixed(2)}) by more than 2%`
    );
  }

  const poMatchStatus = poMatch ? "MATCHED" : "MISMATCH";
  const grnMatchStatus = grnMatch ? "MATCHED" : "MISMATCH";
  const overallStatus = poMatch && grnMatch ? "MATCHED" : "DISCREPANCY";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      poMatchStatus,
      grnMatchStatus,
      matchRemarks: remarks.length > 0 ? remarks.join("; ") : "All values matched within 2% tolerance",
      status: invoice.status === "PENDING" ? overallStatus === "MATCHED" ? "VERIFIED" : "PENDING" : invoice.status,
    },
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(INVOICE_LIST_PATH);

  return { poMatchStatus, grnMatchStatus, remarks, poAmount, grnValue, invoiceAmount };
}

// ============================================================
// APPROVE INVOICE
// ============================================================

export async function approveInvoice(id: string) {
  await requireInvoiceManage();

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw new Error("Invoice not found");

  await prisma.invoice.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  revalidatePath(`/invoices/${id}`);
  revalidatePath(INVOICE_LIST_PATH);
}

// ============================================================
// REJECT INVOICE
// ============================================================

export async function rejectInvoice(id: string, reason: string) {
  await requireInvoiceManage();

  if (!reason) throw new Error("Rejection reason is required");

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw new Error("Invoice not found");

  await prisma.invoice.update({
    where: { id },
    data: {
      status: "REJECTED",
      matchRemarks: reason,
    },
  });

  revalidatePath(`/invoices/${id}`);
  revalidatePath(INVOICE_LIST_PATH);
}

// ============================================================
// GET POs FOR INVOICE
// ============================================================

export async function getPosForInvoice() {
  await requireAuth();

  return prisma.purchaseOrder.findMany({
    where: {
      deletedAt: null,
      status: {
        in: [
          "ACKNOWLEDGED",
          "PARTIALLY_DELIVERED",
          "FULLY_DELIVERED",
          "COMPLETED",
        ],
      },
    },
    select: {
      id: true,
      number: true,
      vendorId: true,
      vendor: { select: { id: true, name: true, code: true } },
      subtotal: true,
      taxAmount: true,
      totalAmount: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
