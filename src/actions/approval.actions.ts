"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
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
// SCHEMAS
// ============================================================

const approveSchema = z.object({
  approvalId: z.string().min(1),
  comments: z.string().optional(),
});

const rejectSchema = z.object({
  approvalId: z.string().min(1),
  comments: z.string().min(1, "Comments are required for rejection"),
});

const returnSchema = z.object({
  approvalId: z.string().min(1),
  comments: z.string().min(1, "Comments are required for return"),
});

// ============================================================
// GET PENDING APPROVALS
// ============================================================

export async function getPendingApprovals() {
  const session = await requireAuth();
  const roleId = session.user.roleId;

  // Find approval rules that match the user's role
  const rules = await prisma.approvalRule.findMany({
    where: {
      approverRoleId: roleId,
      isActive: true,
    },
  });

  if (rules.length === 0) {
    return [];
  }

  // Build a map of entity -> levels for this role
  const roleLevels: { entity: string; level: number }[] = rules.map((r) => ({
    entity: r.entity,
    level: r.level,
  }));

  // Find pending approvals where the current level matches one of the user's rule levels
  const approvals = await prisma.approval.findMany({
    where: {
      status: "PENDING",
      OR: roleLevels.map((rl) => ({
        entity: rl.entity,
        currentLevel: rl.level,
      })),
    },
    include: {
      requirement: {
        select: { id: true, number: true, title: true, createdBy: { select: { name: true } } },
      },
      purchaseOrder: {
        select: {
          id: true,
          number: true,
          totalAmount: true,
          vendor: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      },
      actions: {
        include: {
          actionBy: { select: { id: true, name: true } },
        },
        orderBy: { actionAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return approvals;
}

// ============================================================
// GET APPROVAL HISTORY
// ============================================================

export async function getApprovalHistory(entity: string, entityId: string) {
  await requireAuth();

  const approvals = await prisma.approval.findMany({
    where: { entity, entityId },
    include: {
      actions: {
        include: {
          actionBy: { select: { id: true, name: true } },
        },
        orderBy: { actionAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return approvals;
}

// ============================================================
// GET APPROVAL HISTORY FOR USER (completed approvals)
// ============================================================

export async function getMyApprovalHistory() {
  const session = await requireAuth();

  const actions = await prisma.approvalAction.findMany({
    where: { actionById: session.user.id },
    include: {
      approval: {
        include: {
          requirement: {
            select: { id: true, number: true, title: true },
          },
          purchaseOrder: {
            select: {
              id: true,
              number: true,
              totalAmount: true,
              vendor: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { actionAt: "desc" },
    take: 100,
  });

  return actions;
}

// ============================================================
// CREATE APPROVAL CHAIN
// ============================================================

export async function createApprovalChain(
  entity: string,
  entityId: string,
  amount: number,
  categoryId?: string
) {
  await requireAuth();

  // Look up matching approval rules
  const where: Record<string, unknown> = {
    entity,
    isActive: true,
  };

  if (categoryId) {
    where.OR = [{ categoryId }, { categoryId: null }];
  } else {
    where.categoryId = null;
  }

  const rules = await prisma.approvalRule.findMany({
    where,
    orderBy: { level: "asc" },
  });

  // Filter by amount range
  const matchingRules = rules.filter((rule) => {
    if (rule.minAmount !== null && amount < rule.minAmount) return false;
    if (rule.maxAmount !== null && amount > rule.maxAmount) return false;
    return true;
  });

  if (matchingRules.length === 0) {
    // No approval rules found — auto-approve
    return null;
  }

  // Determine relationship fields
  const relationData: Record<string, string> = {};
  if (entity === "REQUIREMENT") {
    relationData.requirementId = entityId;
  } else if (entity === "PURCHASE_ORDER") {
    relationData.purchaseOrderId = entityId;
  }

  const approval = await prisma.approval.create({
    data: {
      entity,
      entityId,
      ...relationData,
      status: "PENDING",
      currentLevel: matchingRules[0].level,
      totalAmount: amount,
    },
  });

  return approval;
}

// ============================================================
// APPROVE ACTION
// ============================================================

export async function approveAction(approvalId: string, comments?: string) {
  const session = await requireAuth();
  const parsed = approveSchema.parse({ approvalId, comments });

  const approval = await prisma.approval.findUnique({
    where: { id: parsed.approvalId },
  });

  if (!approval) throw new Error("Approval not found");
  if (approval.status !== "PENDING") {
    throw new Error("Approval is not pending");
  }

  // Verify user's role has permission for this level
  const rules = await prisma.approvalRule.findMany({
    where: {
      entity: approval.entity,
      level: approval.currentLevel,
      approverRoleId: session.user.roleId,
      isActive: true,
    },
  });

  if (rules.length === 0) {
    throw new Error("You do not have permission to approve at this level");
  }

  // Record the action
  await prisma.approvalAction.create({
    data: {
      approvalId: parsed.approvalId,
      level: approval.currentLevel,
      action: "APPROVED",
      comments: parsed.comments,
      actionById: session.user.id,
    },
  });

  // Check if there's a next level
  const nextRules = await prisma.approvalRule.findMany({
    where: {
      entity: approval.entity,
      level: { gt: approval.currentLevel },
      isActive: true,
    },
    orderBy: { level: "asc" },
    take: 1,
  });

  // Filter next rules by amount
  const applicableNextRules = nextRules.filter((rule) => {
    if (rule.minAmount !== null && approval.totalAmount < rule.minAmount) return false;
    if (rule.maxAmount !== null && approval.totalAmount > rule.maxAmount) return false;
    return true;
  });

  if (applicableNextRules.length > 0) {
    // Advance to next level
    await prisma.approval.update({
      where: { id: parsed.approvalId },
      data: { currentLevel: applicableNextRules[0].level },
    });
  } else {
    // All levels approved - mark as complete
    await prisma.approval.update({
      where: { id: parsed.approvalId },
      data: { status: "APPROVED" },
    });

    // Update the entity status
    if (approval.entity === "PURCHASE_ORDER" && approval.purchaseOrderId) {
      await prisma.purchaseOrder.update({
        where: { id: approval.purchaseOrderId },
        data: { status: "APPROVED" },
      });
      revalidatePath(`/purchase-orders/${approval.purchaseOrderId}`);
      revalidatePath("/purchase-orders");
    } else if (approval.entity === "REQUIREMENT" && approval.requirementId) {
      await prisma.requirement.update({
        where: { id: approval.requirementId },
        data: { status: "APPROVED" },
      });
      revalidatePath(`/requirements/${approval.requirementId}`);
      revalidatePath("/requirements");
    }
  }

  revalidatePath("/approvals");
  return { success: true };
}

// ============================================================
// REJECT ACTION
// ============================================================

export async function rejectAction(approvalId: string, comments: string) {
  const session = await requireAuth();
  const parsed = rejectSchema.parse({ approvalId, comments });

  const approval = await prisma.approval.findUnique({
    where: { id: parsed.approvalId },
  });

  if (!approval) throw new Error("Approval not found");
  if (approval.status !== "PENDING") {
    throw new Error("Approval is not pending");
  }

  // Verify permission
  const rules = await prisma.approvalRule.findMany({
    where: {
      entity: approval.entity,
      level: approval.currentLevel,
      approverRoleId: session.user.roleId,
      isActive: true,
    },
  });

  if (rules.length === 0) {
    throw new Error("You do not have permission to reject at this level");
  }

  // Record the action
  await prisma.approvalAction.create({
    data: {
      approvalId: parsed.approvalId,
      level: approval.currentLevel,
      action: "REJECTED",
      comments: parsed.comments,
      actionById: session.user.id,
    },
  });

  // Mark approval as rejected
  await prisma.approval.update({
    where: { id: parsed.approvalId },
    data: { status: "REJECTED" },
  });

  // Update entity status
  if (approval.entity === "PURCHASE_ORDER" && approval.purchaseOrderId) {
    await prisma.purchaseOrder.update({
      where: { id: approval.purchaseOrderId },
      data: { status: "DRAFT" },
    });
    revalidatePath(`/purchase-orders/${approval.purchaseOrderId}`);
    revalidatePath("/purchase-orders");
  } else if (approval.entity === "REQUIREMENT" && approval.requirementId) {
    await prisma.requirement.update({
      where: { id: approval.requirementId },
      data: { status: "REJECTED" },
    });
    revalidatePath(`/requirements/${approval.requirementId}`);
    revalidatePath("/requirements");
  }

  revalidatePath("/approvals");
  return { success: true };
}

// ============================================================
// RETURN ACTION
// ============================================================

export async function returnAction(approvalId: string, comments: string) {
  const session = await requireAuth();
  const parsed = returnSchema.parse({ approvalId, comments });

  const approval = await prisma.approval.findUnique({
    where: { id: parsed.approvalId },
  });

  if (!approval) throw new Error("Approval not found");
  if (approval.status !== "PENDING") {
    throw new Error("Approval is not pending");
  }

  // Verify permission
  const rules = await prisma.approvalRule.findMany({
    where: {
      entity: approval.entity,
      level: approval.currentLevel,
      approverRoleId: session.user.roleId,
      isActive: true,
    },
  });

  if (rules.length === 0) {
    throw new Error("You do not have permission to return at this level");
  }

  // Record the action
  await prisma.approvalAction.create({
    data: {
      approvalId: parsed.approvalId,
      level: approval.currentLevel,
      action: "RETURNED",
      comments: parsed.comments,
      actionById: session.user.id,
    },
  });

  // Reset approval to level 1 so the requester can revise
  await prisma.approval.update({
    where: { id: parsed.approvalId },
    data: { status: "REJECTED", currentLevel: 1 },
  });

  // Update entity status back to DRAFT
  if (approval.entity === "PURCHASE_ORDER" && approval.purchaseOrderId) {
    await prisma.purchaseOrder.update({
      where: { id: approval.purchaseOrderId },
      data: { status: "DRAFT" },
    });
    revalidatePath(`/purchase-orders/${approval.purchaseOrderId}`);
    revalidatePath("/purchase-orders");
  } else if (approval.entity === "REQUIREMENT" && approval.requirementId) {
    await prisma.requirement.update({
      where: { id: approval.requirementId },
      data: { status: "DRAFT" },
    });
    revalidatePath(`/requirements/${approval.requirementId}`);
    revalidatePath("/requirements");
  }

  revalidatePath("/approvals");
  return { success: true };
}
