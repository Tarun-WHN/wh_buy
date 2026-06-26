"use server";

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";

async function requireVendor() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "VENDOR" || !session.user.vendorId) {
    throw new Error("Vendor access required");
  }
  return session;
}

export async function getVendorDashboard() {
  const session = await requireVendor();
  const vendorId = session.user.vendorId!;

  const [pendingRfqs, activePOs, pendingPayments, recentRfqVendors, recentPOs] =
    await Promise.all([
      // Pending RFQs: dispatched to this vendor and not yet quoted
      prisma.rfqVendor.count({
        where: {
          vendorId,
          status: "DISPATCHED",
        },
      }),

      // Active POs
      prisma.purchaseOrder.count({
        where: {
          vendorId,
          deletedAt: null,
          status: {
            in: [
              "SENT",
              "ACKNOWLEDGED",
              "PARTIALLY_DELIVERED",
            ],
          },
        },
      }),

      // Pending payments (invoices submitted but not fully paid)
      prisma.invoice.count({
        where: {
          vendorId,
          status: {
            in: ["SUBMITTED", "VERIFIED", "APPROVED"],
          },
        },
      }),

      // Recent RFQs
      prisma.rfqVendor.findMany({
        where: {
          vendorId,
          status: { in: ["DISPATCHED", "QUOTED"] },
        },
        include: {
          rfq: {
            select: {
              id: true,
              number: true,
              title: true,
              submissionDeadline: true,
              _count: { select: { lineItems: true } },
            },
          },
        },
        orderBy: { rfq: { createdAt: "desc" } },
        take: 5,
      }),

      // Recent POs
      prisma.purchaseOrder.findMany({
        where: {
          vendorId,
          deletedAt: null,
          status: { not: "DRAFT" },
        },
        include: {
          warehouse: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return {
    pendingRfqs,
    activePOs,
    pendingPayments,
    recentRfqs: recentRfqVendors.map((rv) => ({
      id: rv.id,
      rfqId: rv.rfq.id,
      rfqNumber: rv.rfq.number,
      rfqTitle: rv.rfq.title,
      status: rv.status,
      deadline: rv.rfq.submissionDeadline,
      itemCount: rv.rfq._count.lineItems,
    })),
    recentPOs: recentPOs.map((po) => ({
      id: po.id,
      number: po.number,
      totalAmount: po.totalAmount,
      status: po.status,
      createdAt: po.createdAt,
      warehouseName: po.warehouse.name,
    })),
  };
}
