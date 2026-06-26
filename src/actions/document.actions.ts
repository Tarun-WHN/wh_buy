"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
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
// GET DOCUMENTS
// ============================================================

export async function getDocuments(entity?: string, entityId?: string) {
  await requireAuth();

  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

// ============================================================
// UPLOAD DOCUMENT (create record)
// ============================================================

export async function uploadDocument(data: {
  name: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  entity: string;
  entityId: string;
  vendorId?: string;
}) {
  const session = await requireAuth();

  const doc = await prisma.document.create({
    data: {
      name: data.name,
      filePath: data.filePath,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      entity: data.entity,
      entityId: data.entityId,
      uploadedBy: session.user.id,
      vendorId: data.vendorId || undefined,
    },
  });

  revalidatePath("/documents");
  return doc;
}

// ============================================================
// DELETE DOCUMENT
// ============================================================

export async function deleteDocument(id: string) {
  await requireAuth();

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new Error("Document not found");

  await prisma.document.delete({ where: { id } });

  revalidatePath("/documents");
}

// ============================================================
// GET RECENT DOCUMENTS
// ============================================================

export async function getRecentDocuments(limit?: number) {
  await requireAuth();

  return prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    take: limit ?? 20,
  });
}

// ============================================================
// SEARCH DOCUMENTS
// ============================================================

export async function searchDocuments(params?: {
  search?: string;
  entity?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 50;

  const where: Record<string, unknown> = {};

  if (params?.search) {
    where.name = { contains: params.search };
  }

  if (params?.entity) {
    where.entity = params.entity;
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.document.count({ where }),
  ]);

  return {
    data: documents,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
