"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

async function requireManage() {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  if (!hasPermission(s.user.role, PERMISSIONS.PO_CREATE))
    throw new Error("You do not have permission to manage projects");
  return s;
}

// ============================================================
// LIST + CREATE
// ============================================================

export async function getProjects() {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    include: {
      purchaseOrders: { where: { deletedAt: null }, select: { totalAmount: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    status: p.status,
    poCount: p.purchaseOrders.length,
    spend: p.purchaseOrders.reduce((a, o) => a + o.totalAmount, 0),
  }));
}

const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
});

export async function createProject(data: z.infer<typeof projectSchema>) {
  const s = await requireManage();
  const p = projectSchema.parse(data);
  const project = await prisma.project.create({
    data: {
      name: p.name,
      code: p.code.toUpperCase(),
      description: p.description,
      createdById: s.user.id,
    },
  });
  revalidatePath("/projects");
  return project;
}

// ============================================================
// PROJECT HISTORY
// ============================================================

async function buildHistory(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      purchaseOrders: {
        where: { deletedAt: null },
        select: {
          number: true,
          totalAmount: true,
          createdAt: true,
          vendor: { select: { name: true } },
          lineItems: {
            select: { productName: true, quantity: true, totalPrice: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!project) return null;

  const pos = project.purchaseOrders;
  const spend = pos.reduce((a, p) => a + p.totalAmount, 0);

  const byVendor = new Map<string, number>();
  const byProduct = new Map<string, { qty: number; spend: number }>();
  for (const po of pos) {
    byVendor.set(po.vendor.name, (byVendor.get(po.vendor.name) ?? 0) + po.totalAmount);
    for (const li of po.lineItems) {
      const e = byProduct.get(li.productName) ?? { qty: 0, spend: 0 };
      e.qty += li.quantity;
      e.spend += li.totalPrice;
      byProduct.set(li.productName, e);
    }
  }

  return {
    id: project.id,
    name: project.name,
    code: project.code,
    status: project.status,
    spend,
    poCount: pos.length,
    vendors: [...byVendor.entries()]
      .map(([name, s]) => ({ name, spend: s }))
      .sort((a, b) => b.spend - a.spend),
    products: [...byProduct.entries()]
      .map(([name, v]) => ({ name, qty: v.qty, spend: v.spend }))
      .sort((a, b) => b.spend - a.spend),
    timeline: pos.map((po) => ({
      number: po.number,
      vendor: po.vendor.name,
      amount: po.totalAmount,
      date: po.createdAt.toISOString(),
    })),
  };
}

export async function getProjectHistory(projectId: string) {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  return buildHistory(projectId);
}

export async function compareProjects(aId: string, bId: string) {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  const [a, b] = await Promise.all([buildHistory(aId), buildHistory(bId)]);
  return { a, b };
}

// ============================================================
// ASSIGN PO TO PROJECT
// ============================================================

export async function assignPoProject(poId: string, projectId: string | null) {
  await requireManage();
  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { projectId: projectId || null },
  });
  revalidatePath(`/purchase-orders/${poId}`);
  revalidatePath("/projects");
}

export async function getProjectOptions() {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  return prisma.project.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}
