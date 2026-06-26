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

export async function getVendorOrders() {
  const session = await requireVendor();
  const vendorId = session.user.vendorId!;

  const orders = await prisma.purchaseOrder.findMany({
    where: {
      vendorId,
      deletedAt: null,
      status: { not: "DRAFT" },
    },
    include: {
      warehouse: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((po) => ({
    id: po.id,
    number: po.number,
    warehouseName: po.warehouse.name,
    totalAmount: po.totalAmount,
    status: po.status,
    createdAt: po.createdAt,
  }));
}

export async function getVendorOrderDetail(id: string) {
  const session = await requireVendor();
  const vendorId = session.user.vendorId!;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      warehouse: { select: { id: true, name: true, code: true, address: true } },
      createdBy: { select: { name: true } },
      lineItems: true,
    },
  });

  if (!po || po.deletedAt) {
    throw new Error("Purchase Order not found");
  }

  if (po.vendorId !== vendorId) {
    throw new Error("This PO does not belong to your vendor account");
  }

  return po;
}
