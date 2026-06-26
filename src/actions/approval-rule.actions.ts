"use server";

export async function getApprovalRules() {
  const prisma = (await import("@/lib/prisma")).default;
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth-options");
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.approvalRule.findMany({
    include: {
      category: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ entity: "asc" }, { level: "asc" }],
  });
}

export async function getCategories() {
  const prisma = (await import("@/lib/prisma")).default;
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth-options");
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.category.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

export async function createApprovalRule(data: {
  name: string;
  entity: string;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  approverRoleId: string;
  level: number;
  isActive: boolean;
}) {
  const prisma = (await import("@/lib/prisma")).default;
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth-options");
  const { hasPermission, PERMISSIONS } = await import("@/lib/permissions");
  const { revalidatePath } = await import("next/cache");

  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, PERMISSIONS.APPROVAL_RULES_MANAGE)) {
    throw new Error("You do not have permission to manage approval rules");
  }

  const rule = await prisma.approvalRule.create({
    data: {
      name: data.name,
      entity: data.entity,
      categoryId: data.categoryId || undefined,
      minAmount: data.minAmount ?? null,
      maxAmount: data.maxAmount ?? null,
      approverRoleId: data.approverRoleId,
      level: data.level,
      isActive: data.isActive,
    },
  });

  revalidatePath("/settings/approval-rules");
  return rule;
}

export async function updateApprovalRule(
  id: string,
  data: {
    name: string;
    entity: string;
    categoryId?: string;
    minAmount?: number;
    maxAmount?: number;
    approverRoleId: string;
    level: number;
    isActive: boolean;
  }
) {
  const prisma = (await import("@/lib/prisma")).default;
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth-options");
  const { hasPermission, PERMISSIONS } = await import("@/lib/permissions");
  const { revalidatePath } = await import("next/cache");

  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, PERMISSIONS.APPROVAL_RULES_MANAGE)) {
    throw new Error("You do not have permission to manage approval rules");
  }

  const rule = await prisma.approvalRule.update({
    where: { id },
    data: {
      name: data.name,
      entity: data.entity,
      categoryId: data.categoryId || null,
      minAmount: data.minAmount ?? null,
      maxAmount: data.maxAmount ?? null,
      approverRoleId: data.approverRoleId,
      level: data.level,
      isActive: data.isActive,
    },
  });

  revalidatePath("/settings/approval-rules");
  return rule;
}

export async function deleteApprovalRule(id: string) {
  const prisma = (await import("@/lib/prisma")).default;
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth-options");
  const { hasPermission, PERMISSIONS } = await import("@/lib/permissions");
  const { revalidatePath } = await import("next/cache");

  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, PERMISSIONS.APPROVAL_RULES_MANAGE)) {
    throw new Error("You do not have permission to manage approval rules");
  }

  await prisma.approvalRule.delete({ where: { id } });
  revalidatePath("/settings/approval-rules");
}
