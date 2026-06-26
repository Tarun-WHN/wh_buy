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
// GET NOTIFICATIONS
// ============================================================

export async function getNotifications(limit?: number) {
  const session = await requireAuth();

  return prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit ?? 50,
  });
}

// ============================================================
// GET UNREAD COUNT
// ============================================================

export async function getUnreadCount() {
  const session = await requireAuth();

  return prisma.notification.count({
    where: { userId: session.user.id, isRead: false },
  });
}

// ============================================================
// MARK AS READ
// ============================================================

export async function markAsRead(id: string) {
  const session = await requireAuth();

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== session.user.id) {
    throw new Error("Notification not found");
  }

  await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
}

// ============================================================
// MARK ALL AS READ
// ============================================================

export async function markAllAsRead() {
  const session = await requireAuth();

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
}

// ============================================================
// CREATE NOTIFICATION (helper for other actions)
// ============================================================

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  link?: string
) {
  await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link,
    },
  });
}
