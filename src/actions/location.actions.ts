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

async function requireLocationPermission() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (!hasPermission(session.user.role, PERMISSIONS.LOCATION_MANAGE)) {
    throw new Error("You do not have permission to manage locations");
  }
  return session;
}

const LOCATION_PATH = "/masters/locations";

// ============================================================
// SCHEMAS
// ============================================================

const companySchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

const regionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  companyId: z.string().min(1, "Company is required"),
  isActive: z.boolean().optional(),
});

const stateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  regionId: z.string().min(1, "Region is required"),
  isActive: z.boolean().optional(),
});

const citySchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10),
  stateId: z.string().min(1, "State is required"),
  isActive: z.boolean().optional(),
});

const warehouseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(20),
  address: z.string().optional(),
  cityId: z.string().min(1, "City is required"),
  isActive: z.boolean().optional(),
});

// ============================================================
// GET LOCATIONS TREE
// ============================================================

export async function getLocations() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    include: {
      regions: {
        where: { deletedAt: null },
        include: {
          states: {
            where: { deletedAt: null },
            include: {
              cities: {
                where: { deletedAt: null },
                include: {
                  warehouses: {
                    where: { deletedAt: null },
                    orderBy: { name: "asc" },
                  },
                },
                orderBy: { name: "asc" },
              },
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return companies;
}

// ============================================================
// COMPANY CRUD
// ============================================================

export async function createCompany(data: z.infer<typeof companySchema>) {
  await requireLocationPermission();
  const parsed = companySchema.parse(data);

  const company = await prisma.company.create({
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      address: parsed.address,
      isActive: parsed.isActive ?? true,
    },
  });

  revalidatePath(LOCATION_PATH);
  return company;
}

export async function updateCompany(
  id: string,
  data: z.infer<typeof companySchema>
) {
  await requireLocationPermission();
  const parsed = companySchema.parse(data);

  const company = await prisma.company.update({
    where: { id },
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      address: parsed.address,
      isActive: parsed.isActive,
    },
  });

  revalidatePath(LOCATION_PATH);
  return company;
}

export async function deleteCompany(id: string) {
  await requireLocationPermission();

  await prisma.company.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath(LOCATION_PATH);
}

// ============================================================
// REGION CRUD
// ============================================================

export async function createRegion(data: z.infer<typeof regionSchema>) {
  await requireLocationPermission();
  const parsed = regionSchema.parse(data);

  const region = await prisma.region.create({
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      companyId: parsed.companyId,
      isActive: parsed.isActive ?? true,
    },
  });

  revalidatePath(LOCATION_PATH);
  return region;
}

export async function updateRegion(
  id: string,
  data: z.infer<typeof regionSchema>
) {
  await requireLocationPermission();
  const parsed = regionSchema.parse(data);

  const region = await prisma.region.update({
    where: { id },
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      companyId: parsed.companyId,
      isActive: parsed.isActive,
    },
  });

  revalidatePath(LOCATION_PATH);
  return region;
}

export async function deleteRegion(id: string) {
  await requireLocationPermission();

  await prisma.region.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath(LOCATION_PATH);
}

// ============================================================
// STATE CRUD
// ============================================================

export async function createState(data: z.infer<typeof stateSchema>) {
  await requireLocationPermission();
  const parsed = stateSchema.parse(data);

  const state = await prisma.state.create({
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      regionId: parsed.regionId,
      isActive: parsed.isActive ?? true,
    },
  });

  revalidatePath(LOCATION_PATH);
  return state;
}

export async function updateState(
  id: string,
  data: z.infer<typeof stateSchema>
) {
  await requireLocationPermission();
  const parsed = stateSchema.parse(data);

  const state = await prisma.state.update({
    where: { id },
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      regionId: parsed.regionId,
      isActive: parsed.isActive,
    },
  });

  revalidatePath(LOCATION_PATH);
  return state;
}

export async function deleteState(id: string) {
  await requireLocationPermission();

  await prisma.state.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath(LOCATION_PATH);
}

// ============================================================
// CITY CRUD
// ============================================================

export async function createCity(data: z.infer<typeof citySchema>) {
  await requireLocationPermission();
  const parsed = citySchema.parse(data);

  const city = await prisma.city.create({
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      stateId: parsed.stateId,
      isActive: parsed.isActive ?? true,
    },
  });

  revalidatePath(LOCATION_PATH);
  return city;
}

export async function updateCity(
  id: string,
  data: z.infer<typeof citySchema>
) {
  await requireLocationPermission();
  const parsed = citySchema.parse(data);

  const city = await prisma.city.update({
    where: { id },
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      stateId: parsed.stateId,
      isActive: parsed.isActive,
    },
  });

  revalidatePath(LOCATION_PATH);
  return city;
}

export async function deleteCity(id: string) {
  await requireLocationPermission();

  await prisma.city.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath(LOCATION_PATH);
}

// ============================================================
// WAREHOUSE CRUD
// ============================================================

export async function createWarehouse(data: z.infer<typeof warehouseSchema>) {
  await requireLocationPermission();
  const parsed = warehouseSchema.parse(data);

  const warehouse = await prisma.warehouse.create({
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      address: parsed.address,
      cityId: parsed.cityId,
      isActive: parsed.isActive ?? true,
    },
  });

  revalidatePath(LOCATION_PATH);
  return warehouse;
}

export async function updateWarehouse(
  id: string,
  data: z.infer<typeof warehouseSchema>
) {
  await requireLocationPermission();
  const parsed = warehouseSchema.parse(data);

  const warehouse = await prisma.warehouse.update({
    where: { id },
    data: {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      address: parsed.address,
      cityId: parsed.cityId,
      isActive: parsed.isActive,
    },
  });

  revalidatePath(LOCATION_PATH);
  return warehouse;
}

export async function deleteWarehouse(id: string) {
  await requireLocationPermission();

  await prisma.warehouse.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath(LOCATION_PATH);
}
