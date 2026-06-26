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

export async function getVendorRfqs() {
  const session = await requireVendor();
  const vendorId = session.user.vendorId!;

  const rfqVendors = await prisma.rfqVendor.findMany({
    where: {
      vendorId,
      rfq: { deletedAt: null },
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
  });

  return rfqVendors.map((rv) => ({
    id: rv.id,
    rfqId: rv.rfq.id,
    rfqNumber: rv.rfq.number,
    rfqTitle: rv.rfq.title,
    itemCount: rv.rfq._count.lineItems,
    deadline: rv.rfq.submissionDeadline,
    status: rv.status,
  }));
}

export async function getVendorId() {
  const session = await requireVendor();
  return session.user.vendorId!;
}

export async function getVendorRfqDetail(rfqId: string) {
  const session = await requireVendor();
  const vendorId = session.user.vendorId!;

  // Verify vendor has access to this RFQ
  const rfqVendor = await prisma.rfqVendor.findFirst({
    where: { rfqId, vendorId },
  });
  if (!rfqVendor) {
    throw new Error("You do not have access to this RFQ");
  }

  // Mark as viewed
  if (!rfqVendor.viewedAt) {
    await prisma.rfqVendor.update({
      where: { id: rfqVendor.id },
      data: { viewedAt: new Date() },
    });
  }

  const rfq = await prisma.rfq.findUnique({
    where: { id: rfqId },
    include: {
      lineItems: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, uom: true, gstPercent: true },
          },
        },
      },
    },
  });

  if (!rfq || rfq.deletedAt) {
    throw new Error("RFQ not found");
  }

  // Get existing quotation for this vendor
  const existingQuotation = await prisma.quotation.findFirst({
    where: { rfqId, vendorId },
    include: {
      items: {
        include: {
          rfqLineItem: {
            include: { product: true },
          },
        },
      },
    },
    orderBy: { revision: "desc" },
  });

  return {
    rfq,
    rfqVendor,
    existingQuotation,
  };
}
