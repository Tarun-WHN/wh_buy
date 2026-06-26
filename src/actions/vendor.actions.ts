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

async function requireVendorPermission() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, PERMISSIONS.VENDOR_MANAGE)) {
    throw new Error("You do not have permission to manage vendors");
  }
  return session;
}

const VENDOR_LIST_PATH = "/masters/vendors";

// ============================================================
// SCHEMAS
// ============================================================

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  legalName: z.string().optional(),
  contactPerson: z.string().min(1, "Contact person is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  cinNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().optional(),
  paymentTerms: z.string().optional(),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
  msmeStatus: z.string().optional(),
  certifications: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
});

// ============================================================
// GET VENDORS
// ============================================================

export async function getVendors(params?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;

  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (params?.search) {
    where.OR = [
      { name: { contains: params.search } },
      { email: { contains: params.search } },
      { code: { contains: params.search } },
    ];
  }

  if (params?.status) {
    where.registrationStatus = params.status;
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      include: {
        vendorCategories: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vendor.count({ where }),
  ]);

  return {
    data: vendors,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// GET SINGLE VENDOR
// ============================================================

export async function getVendor(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      vendorCategories: {
        include: {
          category: true,
        },
      },
      vendorProducts: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!vendor || vendor.deletedAt) {
    throw new Error("Vendor not found");
  }

  return vendor;
}

// ============================================================
// CREATE VENDOR
// ============================================================

export async function createVendor(data: z.infer<typeof vendorSchema>) {
  await requireVendorPermission();
  const parsed = vendorSchema.parse(data);

  const vendor = await prisma.vendor.create({
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      legalName: parsed.legalName,
      contactPerson: parsed.contactPerson,
      email: parsed.email,
      phone: parsed.phone,
      address: parsed.address,
      city: parsed.city,
      state: parsed.state,
      pincode: parsed.pincode,
      gstNumber: parsed.gstNumber,
      panNumber: parsed.panNumber,
      cinNumber: parsed.cinNumber,
      bankName: parsed.bankName,
      bankAccountNumber: parsed.bankAccountNumber,
      bankIfsc: parsed.bankIfsc,
      paymentTerms: parsed.paymentTerms,
      leadTimeDays: parsed.leadTimeDays,
      msmeStatus: parsed.msmeStatus,
      certifications: parsed.certifications,
      registrationStatus: "PENDING",
      vendorCategories: parsed.categoryIds?.length
        ? {
            create: parsed.categoryIds.map((categoryId) => ({
              categoryId,
            })),
          }
        : undefined,
    },
  });

  revalidatePath(VENDOR_LIST_PATH);
  return vendor;
}

// ============================================================
// UPDATE VENDOR
// ============================================================

export async function updateVendor(
  id: string,
  data: z.infer<typeof vendorSchema>
) {
  await requireVendorPermission();
  const parsed = vendorSchema.parse(data);

  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      legalName: parsed.legalName,
      contactPerson: parsed.contactPerson,
      email: parsed.email,
      phone: parsed.phone,
      address: parsed.address,
      city: parsed.city,
      state: parsed.state,
      pincode: parsed.pincode,
      gstNumber: parsed.gstNumber,
      panNumber: parsed.panNumber,
      cinNumber: parsed.cinNumber,
      bankName: parsed.bankName,
      bankAccountNumber: parsed.bankAccountNumber,
      bankIfsc: parsed.bankIfsc,
      paymentTerms: parsed.paymentTerms,
      leadTimeDays: parsed.leadTimeDays,
      msmeStatus: parsed.msmeStatus,
      certifications: parsed.certifications,
    },
  });

  revalidatePath(VENDOR_LIST_PATH);
  revalidatePath(`/masters/vendors/${id}`);
  return vendor;
}

// ============================================================
// DELETE VENDOR (SOFT)
// ============================================================

export async function deleteVendor(id: string) {
  await requireVendorPermission();

  await prisma.vendor.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  revalidatePath(VENDOR_LIST_PATH);
}

// ============================================================
// APPROVE / REJECT VENDOR
// ============================================================

export async function approveVendor(id: string) {
  await requireVendorPermission();

  const vendor = await prisma.vendor.update({
    where: { id },
    data: { registrationStatus: "APPROVED" },
  });

  revalidatePath(VENDOR_LIST_PATH);
  revalidatePath(`/masters/vendors/${id}`);
  return vendor;
}

export async function rejectVendor(id: string) {
  await requireVendorPermission();

  const vendor = await prisma.vendor.update({
    where: { id },
    data: { registrationStatus: "REJECTED" },
  });

  revalidatePath(VENDOR_LIST_PATH);
  revalidatePath(`/masters/vendors/${id}`);
  return vendor;
}

// ============================================================
// ADD / REMOVE VENDOR CATEGORIES
// ============================================================

export async function addVendorCategory(vendorId: string, categoryId: string) {
  await requireVendorPermission();

  await prisma.vendorCategory.create({
    data: { vendorId, categoryId },
  });

  revalidatePath(`/masters/vendors/${vendorId}`);
}

export async function removeVendorCategory(
  vendorId: string,
  categoryId: string
) {
  await requireVendorPermission();

  await prisma.vendorCategory.deleteMany({
    where: { vendorId, categoryId },
  });

  revalidatePath(`/masters/vendors/${vendorId}`);
}

// ============================================================
// IMPORT VENDORS FROM CSV
// ============================================================

export async function importVendors(csvData: string) {
  await requireVendorPermission();

  const lines = csvData
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { success: 0, errors: ["CSV must have a header row and at least one data row"] };
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const requiredHeaders = ["name", "code", "contactperson", "email", "phone"];
  const missing = requiredHeaders.filter((h) => !headers.includes(h));

  if (missing.length > 0) {
    return {
      success: 0,
      errors: [`Missing required columns: ${missing.join(", ")}`],
    };
  }

  let successCount = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    try {
      await prisma.vendor.create({
        data: {
          name: row.name,
          code: row.code.toUpperCase(),
          legalName: row.legalname || undefined,
          contactPerson: row.contactperson,
          email: row.email,
          phone: row.phone,
          address: row.address || undefined,
          city: row.city || undefined,
          state: row.state || undefined,
          pincode: row.pincode || undefined,
          gstNumber: row.gstnumber || undefined,
          panNumber: row.pannumber || undefined,
          paymentTerms: row.paymentterms || undefined,
          registrationStatus: "PENDING",
        },
      });
      successCount++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Row ${i + 1} (${row.name || "unknown"}): ${message}`);
    }
  }

  revalidatePath(VENDOR_LIST_PATH);
  return { success: successCount, errors };
}
