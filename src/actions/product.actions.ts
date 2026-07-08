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

async function requireProductPermission() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, PERMISSIONS.PRODUCT_MANAGE)) {
    throw new Error("You do not have permission to manage products");
  }
  return session;
}

const PRODUCT_LIST_PATH = "/masters/products";

// ============================================================
// SCHEMAS
// ============================================================

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  uom: z.string().min(1, "UOM is required"),
  hsnCode: z.string().optional(),
  gstPercent: z.coerce.number().min(0).max(100).default(0),
  specifications: z.string().optional(),
  modelNumber: z.string().min(1, "Model number is required"),
  size: z.string().min(1, "Size is required"),
  brand: z.string().min(1, "Brand is required"),
  productGroupId: z.string().min(1, "Product group is required"),
  isActive: z.boolean().optional(),
});

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
});

const subcategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  categoryId: z.string().min(1, "Category is required"),
});

const productGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  subcategoryId: z.string().min(1, "Subcategory is required"),
});

// ============================================================
// GET PRODUCTS
// ============================================================

export async function getProducts(params?: {
  search?: string;
  categoryId?: string;
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
      { sku: { contains: params.search } },
    ];
  }

  if (params?.categoryId) {
    where.productGroup = {
      subcategory: {
        categoryId: params.categoryId,
      },
    };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        productGroup: {
          include: {
            subcategory: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ============================================================
// GET SINGLE PRODUCT
// ============================================================

export async function getProduct(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      productGroup: {
        include: {
          subcategory: {
            include: {
              category: true,
            },
          },
        },
      },
      versions: {
        orderBy: { version: "desc" },
      },
    },
  });

  if (!product || product.deletedAt) {
    throw new Error("Product not found");
  }

  return product;
}

// ============================================================
// CREATE PRODUCT
// ============================================================

export async function createProduct(data: z.infer<typeof productSchema>) {
  const session = await requireProductPermission();
  const parsed = productSchema.parse(data);

  const product = await prisma.product.create({
    data: {
      name: parsed.name,
      sku: parsed.sku.toUpperCase(),
      description: parsed.description,
      uom: parsed.uom,
      hsnCode: parsed.hsnCode,
      gstPercent: parsed.gstPercent,
      specifications: parsed.specifications,
      modelNumber: parsed.modelNumber,
      size: parsed.size,
      brand: parsed.brand,
      productGroupId: parsed.productGroupId,
      isActive: parsed.isActive ?? true,
      versions: {
        create: {
          version: 1,
          name: parsed.name,
          description: parsed.description,
          uom: parsed.uom,
          specifications: parsed.specifications,
          changedBy: session.user.id,
          changeReason: "Initial creation",
        },
      },
    },
  });

  revalidatePath(PRODUCT_LIST_PATH);
  return product;
}

// ============================================================
// UPDATE PRODUCT
// ============================================================

export async function updateProduct(
  id: string,
  data: z.infer<typeof productSchema> & { changeReason?: string }
) {
  const session = await requireProductPermission();
  const parsed = productSchema.parse(data);

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new Error("Product not found");

  const newVersion = existing.currentVersion + 1;

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: parsed.name,
      sku: parsed.sku.toUpperCase(),
      description: parsed.description,
      uom: parsed.uom,
      hsnCode: parsed.hsnCode,
      gstPercent: parsed.gstPercent,
      specifications: parsed.specifications,
      modelNumber: parsed.modelNumber,
      size: parsed.size,
      brand: parsed.brand,
      productGroupId: parsed.productGroupId,
      isActive: parsed.isActive,
      currentVersion: newVersion,
      versions: {
        create: {
          version: newVersion,
          name: parsed.name,
          description: parsed.description,
          uom: parsed.uom,
          specifications: parsed.specifications,
          changedBy: session.user.id,
          changeReason: data.changeReason || "Updated",
        },
      },
    },
  });

  revalidatePath(PRODUCT_LIST_PATH);
  revalidatePath(`/masters/products/${id}`);
  return product;
}

// ============================================================
// DELETE PRODUCT (SOFT)
// ============================================================

export async function deleteProduct(id: string) {
  await requireProductPermission();

  await prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  revalidatePath(PRODUCT_LIST_PATH);
}

// ============================================================
// CATEGORIES
// ============================================================

export async function getCategories() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  return prisma.category.findMany({
    where: { deletedAt: null },
    include: {
      subcategories: {
        where: { deletedAt: null },
        include: {
          productGroups: {
            where: { deletedAt: null },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(data: z.infer<typeof categorySchema>) {
  await requireProductPermission();
  const parsed = categorySchema.parse(data);

  const category = await prisma.category.create({
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
    },
  });

  revalidatePath(PRODUCT_LIST_PATH);
  return category;
}

export async function createSubcategory(
  data: z.infer<typeof subcategorySchema>
) {
  await requireProductPermission();
  const parsed = subcategorySchema.parse(data);

  const subcategory = await prisma.subcategory.create({
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      categoryId: parsed.categoryId,
    },
  });

  revalidatePath(PRODUCT_LIST_PATH);
  return subcategory;
}

// ============================================================
// BULK IMPORT (Categories & Products) — accepts parsed rows
// ============================================================

type Row = Record<string, string>;
const lower = (r: Row): Row =>
  Object.fromEntries(
    Object.entries(r).map(([k, v]) => [k.trim().toLowerCase(), String(v ?? "").trim()])
  );
const slug = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10) || "X";

async function freeCategoryCode(base: string) {
  for (let i = 0; i < 50; i++) {
    const code = i === 0 ? base : `${base}${i}`;
    if (!(await prisma.category.findUnique({ where: { code } }))) return code;
  }
  return `${base}${Math.floor(base.length * 7)}`;
}

// Find-or-create the Category → Subcategory → ProductGroup chain.
async function resolveGroup(r: Row) {
  const catName = r.category;
  if (!catName) throw new Error("Category is required");
  let cat = await prisma.category.findFirst({ where: { name: catName, deletedAt: null } });
  if (!cat)
    cat = await prisma.category.create({
      data: { name: catName, code: await freeCategoryCode(r.categorycode ? slug(r.categorycode) : slug(catName)) },
    });

  const subName = r.subcategory || "General";
  let sub = await prisma.subcategory.findFirst({
    where: { name: subName, categoryId: cat.id, deletedAt: null },
  });
  if (!sub)
    sub = await prisma.subcategory.create({
      data: { name: subName, code: slug(subName), categoryId: cat.id },
    });

  const grpName = r.productgroup || "General";
  let grp = await prisma.productGroup.findFirst({
    where: { name: grpName, subcategoryId: sub.id, deletedAt: null },
  });
  if (!grp)
    grp = await prisma.productGroup.create({
      data: { name: grpName, code: slug(grpName), subcategoryId: sub.id },
    });
  return grp.id;
}

export async function importCategories(rows: Row[]) {
  await requireProductPermission();
  let success = 0;
  const errors: string[] = [];
  for (const raw of rows) {
    const r = lower(raw);
    if (!r.category) continue;
    try {
      await resolveGroup(r);
      success++;
    } catch (e) {
      errors.push(`${r.category || "row"}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }
  revalidatePath("/masters/categories");
  revalidatePath(PRODUCT_LIST_PATH);
  return { success, errors };
}

export async function importProducts(rows: Row[]) {
  const session = await requireProductPermission();
  let success = 0;
  const errors: string[] = [];
  for (const raw of rows) {
    const r = lower(raw);
    const name = r.name || r.productname;
    const sku = (r.sku || "").toUpperCase();
    if (!name || !sku) {
      if (name || sku) errors.push(`${name || sku}: name and SKU are required`);
      continue;
    }
    try {
      if (await prisma.product.findUnique({ where: { sku } })) {
        errors.push(`${sku}: already exists — skipped`);
        continue;
      }
      const brand = r.brand || "Local / Non-branded";
      const modelNumber = r.modelnumber || r.model || "NA";
      const size = r.size || "NA";
      const uom = r.uom || "Nos";
      const productGroupId = await resolveGroup(r);

      // ensure brand exists in the brand master
      const existingBrand = await prisma.brand.findFirst({ where: { name: brand } });
      if (!existingBrand) await prisma.brand.create({ data: { name: brand } });

      await prisma.product.create({
        data: {
          name,
          sku,
          uom,
          brand,
          modelNumber,
          size,
          hsnCode: r.hsn || r.hsncode || undefined,
          gstPercent: r.gst ? parseFloat(r.gst) || 0 : 0,
          productGroupId,
          versions: {
            create: {
              version: 1,
              name,
              uom,
              changedBy: session.user.id,
              changeReason: "Bulk import",
            },
          },
        },
      });
      success++;
    } catch (e) {
      errors.push(`${sku}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }
  revalidatePath(PRODUCT_LIST_PATH);
  return { success, errors };
}

export async function createProductGroup(
  data: z.infer<typeof productGroupSchema>
) {
  await requireProductPermission();
  const parsed = productGroupSchema.parse(data);

  const group = await prisma.productGroup.create({
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      subcategoryId: parsed.subcategoryId,
    },
  });

  revalidatePath(PRODUCT_LIST_PATH);
  return group;
}
