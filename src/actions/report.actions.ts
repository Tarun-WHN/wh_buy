"use server";

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";

// ============================================================
// HELPERS
// ============================================================

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// ============================================================
// SPEND REPORT
// ============================================================

export async function generateSpendReport(startDate: string, endDate: string) {
  await requireAuth();

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const pos = await prisma.purchaseOrder.findMany({
    where: {
      deletedAt: null,
      status: { not: "CANCELLED" },
      createdAt: { gte: start, lte: end },
    },
    include: {
      vendor: { select: { name: true, code: true } },
      warehouse: { select: { name: true, code: true } },
      lineItems: {
        select: {
          productName: true,
          sku: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return pos.map((po) => ({
    poNumber: po.number,
    date: po.createdAt.toISOString().split("T")[0],
    vendorName: po.vendor.name,
    vendorCode: po.vendor.code,
    warehouseName: po.warehouse.name,
    warehouseCode: po.warehouse.code,
    status: po.status,
    subtotal: po.subtotal,
    taxAmount: po.taxAmount,
    freightAmount: po.freightAmount,
    totalAmount: po.totalAmount,
    lineItemCount: po.lineItems.length,
  }));
}

// ============================================================
// VENDOR REPORT
// ============================================================

export async function generateVendorReport() {
  await requireAuth();

  const vendors = await prisma.vendor.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { purchaseOrders: true, quotations: true } },
      scorecards: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  // Get spend per vendor
  const pos = await prisma.purchaseOrder.findMany({
    where: { deletedAt: null, status: { not: "CANCELLED" } },
    select: { vendorId: true, totalAmount: true },
  });

  const vendorSpend = new Map<string, number>();
  for (const po of pos) {
    vendorSpend.set(po.vendorId, (vendorSpend.get(po.vendorId) ?? 0) + po.totalAmount);
  }

  return vendors.map((v) => ({
    vendorName: v.name,
    vendorCode: v.code,
    contactPerson: v.contactPerson,
    email: v.email,
    phone: v.phone,
    registrationStatus: v.registrationStatus,
    rating: v.rating,
    totalSpend: Math.round((vendorSpend.get(v.id) ?? 0) * 100) / 100,
    poCount: v._count.purchaseOrders,
    quotationCount: v._count.quotations,
    overallScore: v.scorecards[0]?.overallScore ?? null,
  }));
}

// ============================================================
// RFQ REPORT
// ============================================================

export async function generateRfqReport(startDate: string, endDate: string) {
  await requireAuth();

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const rfqs = await prisma.rfq.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: start, lte: end },
    },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { rfqVendors: true, quotations: true, lineItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rfqs.map((rfq) => ({
    rfqNumber: rfq.number,
    title: rfq.title,
    status: rfq.status,
    rfqType: rfq.rfqType,
    createdBy: rfq.createdBy.name,
    createdDate: rfq.createdAt.toISOString().split("T")[0],
    deadline: rfq.submissionDeadline
      ? rfq.submissionDeadline.toISOString().split("T")[0]
      : "",
    vendorCount: rfq._count.rfqVendors,
    quotationCount: rfq._count.quotations,
    lineItemCount: rfq._count.lineItems,
  }));
}

// ============================================================
// PO REPORT
// ============================================================

export async function generatePoReport(startDate: string, endDate: string) {
  await requireAuth();

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const pos = await prisma.purchaseOrder.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: start, lte: end },
    },
    include: {
      vendor: { select: { name: true, code: true } },
      warehouse: { select: { name: true } },
      createdBy: { select: { name: true } },
      _count: { select: { lineItems: true, deliveries: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return pos.map((po) => ({
    poNumber: po.number,
    status: po.status,
    vendorName: po.vendor.name,
    vendorCode: po.vendor.code,
    warehouseName: po.warehouse.name,
    createdBy: po.createdBy.name,
    createdDate: po.createdAt.toISOString().split("T")[0],
    deliveryDate: po.deliveryDate
      ? po.deliveryDate.toISOString().split("T")[0]
      : "",
    subtotal: po.subtotal,
    taxAmount: po.taxAmount,
    freightAmount: po.freightAmount,
    totalAmount: po.totalAmount,
    revision: po.revision,
    lineItemCount: po._count.lineItems,
    deliveryCount: po._count.deliveries,
  }));
}

// ============================================================
// AGING REPORT
// ============================================================

export async function generateAgingReport() {
  await requireAuth();

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["SUBMITTED", "VERIFIED", "APPROVED", "PARTIALLY_PAID"] },
    },
    include: {
      vendor: { select: { name: true, code: true } },
      purchaseOrder: { select: { number: true } },
      payments: { select: { amount: true } },
    },
  });

  const now = new Date();

  return invoices.map((inv) => {
    const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = inv.totalAmount - totalPaid;
    const daysSinceInvoice = Math.floor(
      (now.getTime() - new Date(inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    let agingBucket = "0-30";
    if (daysSinceInvoice > 90) agingBucket = "90+";
    else if (daysSinceInvoice > 60) agingBucket = "61-90";
    else if (daysSinceInvoice > 30) agingBucket = "31-60";

    return {
      invoiceNumber: inv.number,
      vendorInvoiceNo: inv.vendorInvoiceNo,
      vendorName: inv.vendor.name,
      poNumber: inv.purchaseOrder.number,
      invoiceDate: inv.invoiceDate.toISOString().split("T")[0],
      dueDate: inv.dueDate ? inv.dueDate.toISOString().split("T")[0] : "",
      totalAmount: inv.totalAmount,
      totalPaid,
      outstanding: Math.round(outstanding * 100) / 100,
      daysSinceInvoice,
      agingBucket,
    };
  });
}
