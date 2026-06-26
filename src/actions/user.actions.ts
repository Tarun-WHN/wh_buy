"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
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

async function requireUserManage() {
  const session = await requireAuth();
  if (!hasPermission(session.user.role, PERMISSIONS.USER_MANAGE)) {
    throw new Error("You do not have permission to manage users");
  }
  return session;
}

// ============================================================
// SCHEMAS
// ============================================================

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  roleId: z.string().min(1, "Role is required"),
  warehouseId: z.string().optional(),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  roleId: z.string().min(1, "Role is required"),
  warehouseId: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// GET USERS
// ============================================================

export async function getUsers(params?: {
  search?: string;
  role?: string;
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
      { name: { contains: params.search } },
      { email: { contains: params.search } },
    ];
  }

  if (params?.role) {
    where.role = { name: params.role };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        role: { select: { id: true, name: true, label: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      warehouse: u.warehouse,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// GET SINGLE USER
// ============================================================

export async function getUser(id: string) {
  await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: { select: { id: true, name: true, label: true } },
      warehouse: { select: { id: true, name: true, code: true } },
    },
  });

  if (!user || user.deletedAt) throw new Error("User not found");

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    warehouse: user.warehouse,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

// ============================================================
// CREATE USER
// ============================================================

export async function createUser(data: z.infer<typeof createUserSchema>) {
  await requireUserManage();
  const parsed = createUserSchema.parse(data);

  const existing = await prisma.user.findUnique({
    where: { email: parsed.email },
  });
  if (existing) throw new Error("A user with this email already exists");

  const passwordHash = await bcrypt.hash(parsed.password, 12);

  const user = await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      passwordHash,
      roleId: parsed.roleId,
      warehouseId: parsed.warehouseId || undefined,
      phone: parsed.phone || undefined,
    },
  });

  revalidatePath("/settings/users");
  return user;
}

// ============================================================
// UPDATE USER
// ============================================================

export async function updateUser(id: string, data: z.infer<typeof updateUserSchema>) {
  await requireUserManage();
  const parsed = updateUserSchema.parse(data);

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new Error("User not found");

  // Check email uniqueness
  if (parsed.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({
      where: { email: parsed.email },
    });
    if (emailTaken) throw new Error("A user with this email already exists");
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.name,
      email: parsed.email,
      roleId: parsed.roleId,
      warehouseId: parsed.warehouseId || null,
      phone: parsed.phone || null,
      isActive: parsed.isActive ?? existing.isActive,
    },
  });

  revalidatePath("/settings/users");
  return user;
}

// ============================================================
// DELETE USER (SOFT)
// ============================================================

export async function deleteUser(id: string) {
  await requireUserManage();

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new Error("User not found");

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  revalidatePath("/settings/users");
}

// ============================================================
// RESET PASSWORD
// ============================================================

export async function resetPassword(id: string, newPassword: string) {
  await requireUserManage();

  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new Error("User not found");

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  revalidatePath("/settings/users");
}

// ============================================================
// CHANGE OWN PASSWORD
// ============================================================

export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string
) {
  const session = await requireAuth();

  if (!newPassword || newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) throw new Error("User not found");

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new Error("Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });
}

// ============================================================
// GET ROLES & WAREHOUSES FOR FORMS
// ============================================================

export async function getRoles() {
  await requireAuth();
  return prisma.role.findMany({
    select: { id: true, name: true, label: true, isSystem: true, permissions: true },
    orderBy: { name: "asc" },
  });
}

export async function getWarehousesForForm() {
  await requireAuth();
  return prisma.warehouse.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

// ============================================================
// UPDATE ROLE PERMISSIONS
// ============================================================

export async function updateRolePermissions(
  roleId: string,
  permissions: string[]
) {
  const session = await requireAuth();
  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Only Super Admin can modify role permissions");
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error("Role not found");

  // Don't allow modifying SUPER_ADMIN permissions
  if (role.name === "SUPER_ADMIN") {
    throw new Error("Super Admin permissions cannot be modified");
  }

  await prisma.role.update({
    where: { id: roleId },
    data: { permissions: JSON.stringify(permissions) },
  });

  revalidatePath("/settings/roles");
}
