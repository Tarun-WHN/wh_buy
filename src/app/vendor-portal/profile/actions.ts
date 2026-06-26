"use server";

import { getServerSession } from "next-auth";
import { z } from "zod";
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

export async function getVendorProfile() {
  const session = await requireVendor();
  const vendorId = session.user.vendorId!;

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      name: true,
      code: true,
      legalName: true,
      gstNumber: true,
      panNumber: true,
      contactPerson: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      bankName: true,
      msmeStatus: true,
      certifications: true,
      registrationStatus: true,
      rating: true,
    },
  });

  if (!vendor) {
    throw new Error("Vendor profile not found");
  }

  return vendor;
}

const updateContactSchema = z.object({
  contactPerson: z.string().min(1, "Contact person is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
});

export async function updateVendorContact(
  data: z.infer<typeof updateContactSchema>
) {
  const session = await requireVendor();
  const vendorId = session.user.vendorId!;
  const parsed = updateContactSchema.parse(data);

  await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      contactPerson: parsed.contactPerson,
      email: parsed.email,
      phone: parsed.phone,
    },
  });

  return { success: true };
}
