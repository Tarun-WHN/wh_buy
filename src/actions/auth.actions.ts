"use server";

export async function registerVendor(data: {
  companyName: string;
  legalName: string;
  contactPerson: string;
  email: string;
  phone: string;
  password: string;
  gstNumber: string;
  panNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}) {
  const prisma = (await import("@/lib/prisma")).default;
  const bcrypt = (await import("bcryptjs")).default;

  // Validate
  if (!data.companyName || !data.email || !data.password || !data.contactPerson || !data.phone) {
    throw new Error("Please fill in all required fields");
  }

  if (data.password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  // Find VENDOR role
  const vendorRole = await prisma.role.findUnique({
    where: { name: "VENDOR" },
  });
  if (!vendorRole) {
    throw new Error("Vendor role not found. Please contact the administrator.");
  }

  // Generate vendor code
  const vendorCount = await prisma.vendor.count();
  const vendorCode = `VND-${String(vendorCount + 1).padStart(5, "0")}`;

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // Create Vendor, User, and VendorUser in a transaction
  await prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.create({
      data: {
        name: data.companyName,
        code: vendorCode,
        legalName: data.legalName || undefined,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        gstNumber: data.gstNumber || undefined,
        panNumber: data.panNumber || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        pincode: data.pincode || undefined,
        registrationStatus: "PENDING",
      },
    });

    const user = await tx.user.create({
      data: {
        name: data.contactPerson,
        email: data.email,
        passwordHash,
        roleId: vendorRole.id,
        phone: data.phone || undefined,
      },
    });

    await tx.vendorUser.create({
      data: {
        userId: user.id,
        vendorId: vendor.id,
      },
    });
  });
}
