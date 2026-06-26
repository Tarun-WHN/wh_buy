"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

// ============================================================
// HELPERS
// ============================================================

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function requirePaymentManage() {
  const session = await requireAuth();
  if (!hasPermission(session.user.role, PERMISSIONS.PAYMENT_MANAGE)) {
    throw new Error("You do not have permission to manage payments");
  }
  return session;
}

const PAYMENTS_PATH = "/payments";

// ============================================================
// SCHEMAS
// ============================================================

const createPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMode: z.string().min(1, "Payment mode is required"),
  referenceNo: z.string().optional(),
  remarks: z.string().optional(),
});

// ============================================================
// GET PAYMENTS
// ============================================================

export async function getPayments(params?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;

  const where: Record<string, unknown> = {};

  if (params?.search) {
    where.OR = [
      { referenceNo: { contains: params.search } },
    ];
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            number: true,
            vendorInvoiceNo: true,
            totalAmount: true,
            vendor: { select: { id: true, name: true } },
            purchaseOrder: { select: { id: true, number: true } },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    data: payments,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// GET PAYMENTS BY INVOICE
// ============================================================

export async function getPaymentsByInvoice(invoiceId: string) {
  await requireAuth();

  return prisma.payment.findMany({
    where: { invoiceId },
    orderBy: { paymentDate: "desc" },
  });
}

// ============================================================
// CREATE PAYMENT
// ============================================================

export async function createPayment(data: z.infer<typeof createPaymentSchema>) {
  await requirePaymentManage();
  const parsed = createPaymentSchema.parse(data);

  const invoice = await prisma.invoice.findUnique({
    where: { id: parsed.invoiceId },
    include: { payments: true },
  });
  if (!invoice) throw new Error("Invoice not found");

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = invoice.totalAmount - totalPaid;

  if (parsed.amount > outstanding + 0.01) {
    throw new Error(
      `Payment amount (${parsed.amount}) exceeds outstanding amount (${outstanding.toFixed(2)})`
    );
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId: parsed.invoiceId,
      amount: parsed.amount,
      paymentDate: new Date(parsed.paymentDate),
      paymentMode: parsed.paymentMode,
      referenceNo: parsed.referenceNo,
      remarks: parsed.remarks,
    },
  });

  // Update invoice status
  const newTotalPaid = totalPaid + parsed.amount;
  const isFullyPaid = Math.abs(newTotalPaid - invoice.totalAmount) < 0.01;

  await prisma.invoice.update({
    where: { id: parsed.invoiceId },
    data: {
      status: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
    },
  });

  revalidatePath(PAYMENTS_PATH);
  revalidatePath(`/invoices/${parsed.invoiceId}`);
  return payment;
}

// ============================================================
// AGING REPORT
// ============================================================

export async function getAgingReport() {
  await requireAuth();

  const invoices = await prisma.invoice.findMany({
    where: {
      status: {
        in: ["PENDING", "VERIFIED", "APPROVED", "PARTIALLY_PAID", "MATCHED", "DISCREPANCY"],
      },
    },
    include: {
      payments: true,
      vendor: { select: { id: true, name: true } },
      purchaseOrder: { select: { id: true, number: true } },
    },
  });

  const now = new Date();
  const buckets = {
    "0-30": { count: 0, total: 0, invoices: [] as typeof invoices },
    "31-60": { count: 0, total: 0, invoices: [] as typeof invoices },
    "61-90": { count: 0, total: 0, invoices: [] as typeof invoices },
    "90+": { count: 0, total: 0, invoices: [] as typeof invoices },
  };

  for (const inv of invoices) {
    const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = inv.totalAmount - totalPaid;
    if (outstanding <= 0) continue;

    const dueDate = inv.dueDate ?? inv.invoiceDate;
    const daysDiff = Math.floor(
      (now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    let bucket: keyof typeof buckets;
    if (daysDiff <= 30) bucket = "0-30";
    else if (daysDiff <= 60) bucket = "31-60";
    else if (daysDiff <= 90) bucket = "61-90";
    else bucket = "90+";

    buckets[bucket].count += 1;
    buckets[bucket].total += outstanding;
    buckets[bucket].invoices.push(inv);
  }

  return buckets;
}

// ============================================================
// PAYMENT SUMMARY
// ============================================================

export async function getPaymentSummary() {
  await requireAuth();

  // Total outstanding
  const outstandingInvoices = await prisma.invoice.findMany({
    where: {
      status: {
        in: ["PENDING", "VERIFIED", "APPROVED", "PARTIALLY_PAID", "MATCHED", "DISCREPANCY"],
      },
    },
    include: { payments: true },
  });

  let totalOutstanding = 0;
  let totalOverdue = 0;
  const now = new Date();

  for (const inv of outstandingInvoices) {
    const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = inv.totalAmount - paid;
    if (outstanding <= 0) continue;

    totalOutstanding += outstanding;

    const dueDate = inv.dueDate ?? inv.invoiceDate;
    if (new Date(dueDate) < now) {
      totalOverdue += outstanding;
    }
  }

  // Total paid this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const monthPayments = await prisma.payment.findMany({
    where: {
      paymentDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  const totalPaidThisMonth = monthPayments.reduce((sum, p) => sum + p.amount, 0);

  return {
    totalOutstanding,
    totalPaidThisMonth,
    totalOverdue,
  };
}

// ============================================================
// GET PENDING INVOICES FOR PAYMENT
// ============================================================

export async function getPendingInvoicesForPayment() {
  await requireAuth();

  const invoices = await prisma.invoice.findMany({
    where: {
      status: {
        in: ["APPROVED", "VERIFIED", "PARTIALLY_PAID", "MATCHED"],
      },
    },
    include: {
      payments: true,
      vendor: { select: { id: true, name: true } },
      purchaseOrder: { select: { id: true, number: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  return invoices.map((inv) => {
    const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    return {
      ...inv,
      totalPaid,
      outstanding: inv.totalAmount - totalPaid,
    };
  }).filter((inv) => inv.outstanding > 0);
}
