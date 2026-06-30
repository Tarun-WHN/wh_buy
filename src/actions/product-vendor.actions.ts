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
    throw new Error("You do not have permission to manage vendor pricing");
  }
  return session;
}

// Build a unique vendor code from a name (e.g. "Acme Traders" -> "ACMETR-4821").
async function uniqueVendorCode(name: string): Promise<string> {
  const base =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6) || "VENDOR";
  for (let i = 0; i < 10; i++) {
    // Deterministic-ish suffix from name + attempt to keep retries cheap.
    const suffix = String(1000 + ((base.length * 37 + i * 911) % 9000));
    const code = `${base}-${suffix}`;
    const existing = await prisma.vendor.findUnique({ where: { code } });
    if (!existing) return code;
  }
  // Fallback to a count-based code.
  const count = await prisma.vendor.count();
  return `VND-${String(count + 1).padStart(5, "0")}`;
}

// ============================================================
// GET VENDOR OFFERS FOR A PRODUCT
// ============================================================

export async function getProductVendors(productId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.vendorProduct.findMany({
    where: { productId },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          code: true,
          contactPerson: true,
          phone: true,
          email: true,
          registrationStatus: true,
        },
      },
    },
    orderBy: [{ rate: "asc" }, { createdAt: "desc" }],
  });
}

// Vendors that can be linked to this product (not already linked).
export async function getLinkableVendors(productId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const linked = await prisma.vendorProduct.findMany({
    where: { productId },
    select: { vendorId: true },
  });
  const linkedIds = linked.map((l) => l.vendorId);

  return prisma.vendor.findMany({
    where: { deletedAt: null, id: { notIn: linkedIds } },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

// ============================================================
// UPSERT VENDOR OFFER (with optional quick-create vendor by name)
// ============================================================

const offerSchema = z.object({
  productId: z.string().min(1),
  vendorId: z.string().optional(),
  newVendorName: z.string().optional(),
  rate: z.coerce.number().min(0).optional(),
  currency: z.string().default("INR"),
  moq: z.coerce.number().min(0).optional(),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
  validUntil: z.string().optional(),
  quoteFilePath: z.string().optional(),
  quoteFileName: z.string().optional(),
  remarks: z.string().optional(),
});

export async function upsertProductVendor(data: z.infer<typeof offerSchema>) {
  await requireVendorPermission();
  const parsed = offerSchema.parse(data);

  if (!parsed.vendorId && !parsed.newVendorName?.trim()) {
    throw new Error("Select an existing vendor or enter a new vendor name");
  }

  // Resolve the vendor — quick-create a minimal one if a name was typed.
  let vendorId = parsed.vendorId;
  if (!vendorId && parsed.newVendorName?.trim()) {
    const name = parsed.newVendorName.trim();
    const code = await uniqueVendorCode(name);
    const vendor = await prisma.vendor.create({
      data: {
        name,
        code,
        contactPerson: name,
        email: "",
        phone: "",
        registrationStatus: "PENDING",
      },
    });
    vendorId = vendor.id;
  }

  if (!vendorId) throw new Error("Could not resolve vendor");

  const validUntil = parsed.validUntil ? new Date(parsed.validUntil) : null;

  const offer = await prisma.vendorProduct.upsert({
    where: {
      vendorId_productId: { vendorId, productId: parsed.productId },
    },
    create: {
      vendorId,
      productId: parsed.productId,
      rate: parsed.rate,
      currency: parsed.currency,
      moq: parsed.moq,
      leadTimeDays: parsed.leadTimeDays,
      validUntil,
      quoteFilePath: parsed.quoteFilePath,
      quoteFileName: parsed.quoteFileName,
      remarks: parsed.remarks,
    },
    update: {
      rate: parsed.rate,
      currency: parsed.currency,
      moq: parsed.moq,
      leadTimeDays: parsed.leadTimeDays,
      validUntil,
      // Keep an existing quote if no new file was provided this time.
      ...(parsed.quoteFilePath
        ? {
            quoteFilePath: parsed.quoteFilePath,
            quoteFileName: parsed.quoteFileName,
          }
        : {}),
      remarks: parsed.remarks,
    },
  });

  // Log the quoted rate to price history so quote comparison / trends benefit.
  if (parsed.rate != null) {
    await prisma.priceHistory.create({
      data: {
        productId: parsed.productId,
        vendorId,
        unitPrice: parsed.rate,
        quantity: parsed.moq ?? 1,
        sourceType: "VENDOR_OFFER",
        sourceId: offer.id,
      },
    });
  }

  revalidatePath(`/masters/products/${parsed.productId}`);
  return offer;
}

// ============================================================
// DELETE VENDOR OFFER
// ============================================================

export async function deleteProductVendor(id: string) {
  await requireVendorPermission();

  const offer = await prisma.vendorProduct.findUnique({ where: { id } });
  if (!offer) throw new Error("Offer not found");

  await prisma.vendorProduct.delete({ where: { id } });
  revalidatePath(`/masters/products/${offer.productId}`);
}
