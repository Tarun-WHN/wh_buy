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

async function requireRequirementCreate() {
  const session = await requireAuth();
  if (!hasPermission(session.user.role, PERMISSIONS.REQUIREMENT_CREATE)) {
    throw new Error("You do not have permission to create requirements");
  }
  return session;
}

async function requireRequirementApprove() {
  const session = await requireAuth();
  if (!hasPermission(session.user.role, PERMISSIONS.REQUIREMENT_APPROVE)) {
    throw new Error("You do not have permission to approve requirements");
  }
  return session;
}

const REQUIREMENT_LIST_PATH = "/requirements";

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

const requirementItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  specifications: z.string().optional(),
  remarks: z.string().optional(),
});

const requirementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  warehouseId: z.string().min(1, "Warehouse is required"),
  department: z.string().optional(),
  priority: z.string().default("MEDIUM"),
  requiredDate: z.string().optional(),
  items: z.array(requirementItemSchema).min(1, "At least one item is required"),
});

// ============================================================
// GET REQUIREMENTS
// ============================================================

export async function getRequirements(params?: {
  search?: string;
  status?: string;
  priority?: string;
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
      { title: { contains: params.search } },
      { number: { contains: params.search } },
    ];
  }

  if (params?.status) {
    where.status = params.status;
  }

  if (params?.priority) {
    where.priority = params.priority;
  }

  if (params?.warehouseId) {
    where.warehouseId = params.warehouseId;
  }

  const [requirements, total] = await Promise.all([
    prisma.requirement.findMany({
      where,
      include: {
        warehouse: true,
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.requirement.count({ where }),
  ]);

  return {
    data: requirements,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// GET SINGLE REQUIREMENT
// ============================================================

export async function getRequirement(id: string) {
  await requireAuth();

  const requirement = await prisma.requirement.findUnique({
    where: { id },
    include: {
      warehouse: true,
      createdBy: { select: { id: true, name: true } },
      items: {
        include: {
          product: true,
        },
      },
      rfqs: {
        select: { id: true, number: true, status: true },
      },
    },
  });

  if (!requirement || requirement.deletedAt) {
    throw new Error("Requirement not found");
  }

  return requirement;
}

// ============================================================
// CREATE REQUIREMENT
// ============================================================

export async function createRequirement(data: z.infer<typeof requirementSchema>) {
  const session = await requireRequirementCreate();
  const parsed = requirementSchema.parse(data);

  const seq = await getNextSequence("REQUIREMENT", "REQ");
  const number = generateNumber("REQ", seq);

  const requirement = await prisma.requirement.create({
    data: {
      number,
      title: parsed.title,
      description: parsed.description,
      warehouseId: parsed.warehouseId,
      department: parsed.department,
      priority: parsed.priority,
      requiredDate: parsed.requiredDate ? new Date(parsed.requiredDate) : undefined,
      status: "DRAFT",
      createdById: session.user.id,
      items: {
        create: parsed.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          specifications: item.specifications,
          remarks: item.remarks,
        })),
      },
    },
  });

  revalidatePath(REQUIREMENT_LIST_PATH);
  return requirement;
}

// ============================================================
// UPDATE REQUIREMENT
// ============================================================

export async function updateRequirement(
  id: string,
  data: z.infer<typeof requirementSchema>
) {
  await requireRequirementCreate();
  const parsed = requirementSchema.parse(data);

  const existing = await prisma.requirement.findUnique({ where: { id } });
  if (!existing) throw new Error("Requirement not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft requirements can be updated");
  }

  // Delete existing items and recreate
  await prisma.requirementItem.deleteMany({ where: { requirementId: id } });

  const requirement = await prisma.requirement.update({
    where: { id },
    data: {
      title: parsed.title,
      description: parsed.description,
      warehouseId: parsed.warehouseId,
      department: parsed.department,
      priority: parsed.priority,
      requiredDate: parsed.requiredDate ? new Date(parsed.requiredDate) : undefined,
      items: {
        create: parsed.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          specifications: item.specifications,
          remarks: item.remarks,
        })),
      },
    },
  });

  revalidatePath(REQUIREMENT_LIST_PATH);
  revalidatePath(`/requirements/${id}`);
  return requirement;
}

// ============================================================
// SUBMIT REQUIREMENT
// ============================================================

export async function submitRequirement(id: string) {
  await requireRequirementCreate();

  const existing = await prisma.requirement.findUnique({ where: { id } });
  if (!existing) throw new Error("Requirement not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft requirements can be submitted");
  }

  const requirement = await prisma.requirement.update({
    where: { id },
    data: { status: "SUBMITTED" },
  });

  revalidatePath(REQUIREMENT_LIST_PATH);
  revalidatePath(`/requirements/${id}`);
  return requirement;
}

// ============================================================
// APPROVE REQUIREMENT
// ============================================================

export async function approveRequirement(id: string) {
  await requireRequirementApprove();

  const existing = await prisma.requirement.findUnique({ where: { id } });
  if (!existing) throw new Error("Requirement not found");
  if (existing.status !== "SUBMITTED") {
    throw new Error("Only submitted requirements can be approved");
  }

  const requirement = await prisma.requirement.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  revalidatePath(REQUIREMENT_LIST_PATH);
  revalidatePath(`/requirements/${id}`);
  return requirement;
}

// ============================================================
// REJECT REQUIREMENT
// ============================================================

export async function rejectRequirement(id: string, reason?: string) {
  await requireRequirementApprove();

  const existing = await prisma.requirement.findUnique({ where: { id } });
  if (!existing) throw new Error("Requirement not found");
  if (existing.status !== "SUBMITTED") {
    throw new Error("Only submitted requirements can be rejected");
  }

  const requirement = await prisma.requirement.update({
    where: { id },
    data: {
      status: "REJECTED",
      description: reason
        ? `${existing.description || ""}\n\n[REJECTION REASON]: ${reason}`.trim()
        : existing.description,
    },
  });

  revalidatePath(REQUIREMENT_LIST_PATH);
  revalidatePath(`/requirements/${id}`);
  return requirement;
}

// ============================================================
// DELETE REQUIREMENT
// ============================================================

export async function deleteRequirement(id: string) {
  await requireRequirementCreate();

  const existing = await prisma.requirement.findUnique({ where: { id } });
  if (!existing) throw new Error("Requirement not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft requirements can be deleted");
  }

  await prisma.requirement.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath(REQUIREMENT_LIST_PATH);
}

// ============================================================
// GET WAREHOUSES (helper for forms)
// ============================================================

export async function getWarehouses() {
  await requireAuth();

  return prisma.warehouse.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: { name: "asc" },
  });
}

// ============================================================
// GET PRODUCTS (helper for forms)
// ============================================================

export async function getProductsForSelection(search?: string) {
  await requireAuth();

  const where: Record<string, unknown> = {
    deletedAt: null,
    isActive: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
    ];
  }

  return prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      sku: true,
      uom: true,
    },
    orderBy: { name: "asc" },
    take: 50,
  });
}
