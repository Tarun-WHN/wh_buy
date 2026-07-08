"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

type Row = Record<string, string>;

async function uniqueVendorCode(name: string) {
  const base = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "VENDOR";
  for (let i = 0; i < 30; i++) {
    const code = i === 0 ? base : `${base}${i}`;
    if (!(await prisma.vendor.findUnique({ where: { code } }))) return code;
  }
  const count = await prisma.vendor.count();
  return `VND-${String(count + 1).padStart(5, "0")}`;
}

// Import historical bills / price data. For each row it resolves the product
// (by SKU or name), finds-or-creates the vendor (capturing city of supply), and
// updates price history + the vendor↔product rate — so benchmarking, savings,
// recommendations and the knowledge graph light up with real data.
export async function importBills(rows: Row[]) {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("Unauthorized");
  if (!hasPermission(s.user.role, PERMISSIONS.VENDOR_MANAGE))
    throw new Error("You do not have permission to import bills");

  let success = 0;
  const errors: string[] = [];

  for (const raw of rows) {
    const r = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k.trim().toLowerCase(), String(v ?? "").trim()])
    );
    const sku = (r.sku || "").toUpperCase();
    const productName = r.product || r.productname || "";
    const vendorName = r.vendor || r.vendorname || "";
    const rate = parseFloat(r.rate || r.price || r.unitprice || "0");

    if ((!sku && !productName) || !vendorName || !rate || rate <= 0) {
      if (sku || productName || vendorName)
        errors.push(`${sku || productName || vendorName}: needs product, vendor and a rate`);
      continue;
    }

    try {
      const product = sku
        ? await prisma.product.findUnique({ where: { sku } })
        : await prisma.product.findFirst({ where: { name: productName, deletedAt: null } });
      if (!product) {
        errors.push(`${sku || productName}: product not found — add it to Product Master first`);
        continue;
      }

      let vendor = await prisma.vendor.findFirst({
        where: { name: vendorName, deletedAt: null },
      });
      if (!vendor) {
        vendor = await prisma.vendor.create({
          data: {
            name: vendorName,
            code: await uniqueVendorCode(vendorName),
            contactPerson: vendorName,
            email: "",
            phone: "",
            city: r.city || undefined,
            state: r.state || undefined,
            registrationStatus: "PENDING",
          },
        });
      } else if (r.city && !vendor.city) {
        await prisma.vendor.update({ where: { id: vendor.id }, data: { city: r.city } });
      }

      const qty = r.quantity ? parseFloat(r.quantity) || 1 : 1;
      const parsed = r.date ? new Date(r.date) : new Date();
      const recordedAt = isNaN(parsed.getTime()) ? new Date() : parsed;

      await prisma.priceHistory.create({
        data: {
          productId: product.id,
          vendorId: vendor.id,
          unitPrice: rate,
          quantity: qty,
          sourceType: "BILL_IMPORT",
          sourceId: r.ponumber || r.billno || "import",
          recordedAt,
        },
      });

      await prisma.vendorProduct.upsert({
        where: { vendorId_productId: { vendorId: vendor.id, productId: product.id } },
        create: { vendorId: vendor.id, productId: product.id, rate },
        update: { rate },
      });

      success++;
    } catch (e) {
      errors.push(`${sku || productName}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  revalidatePath("/intelligence");
  revalidatePath("/masters/vendors");
  return { success, errors };
}
