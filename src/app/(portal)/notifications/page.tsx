"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "@/actions/notification.actions";

// ============================================================
// TYPES
// ============================================================

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

// ============================================================
// HELPERS
// ============================================================

function getTypeIcon(type: string) {
  switch (type) {
    case "SUCCESS":
    case "APPROVED":
      return <CheckCircle className="size-4 text-green-600" />;
    case "WARNING":
    case "ESCALATED":
      return <AlertTriangle className="size-4 text-amber-600" />;
    case "ERROR":
    case "REJECTED":
      return <XCircle className="size-4 text-red-600" />;
    default:
      return <Info className="size-4 text-blue-600" />;
  }
}

function getTypeBadgeVariant(
  type: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "SUCCESS":
    case "APPROVED":
      return "default";
    case "WARNING":
    case "ESCALATED":
      return "secondary";
    case "ERROR":
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN");
}

// ============================================================
// PAGE
// ============================================================

export default function NotificationsPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  function loadNotifications() {
    startTransition(async () => {
      try {
        const data = await getNotifications(100);
        setNotifications(data as unknown as NotificationItem[]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load notifications"
        );
      }
    });
  }

  async function handleMarkAllRead() {
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
      loadNotifications();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to mark all as read"
      );
    }
  }

  async function handleNotificationClick(notification: NotificationItem) {
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
        loadNotifications();
      } catch {
        // silent
      }
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0 ? `${unreadCount} unread` : "All caught up"
        }
      >
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            <CheckCheck className="mr-2 size-4" />
            Mark All Read
          </Button>
        )}
      </PageHeader>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isPending ? "Loading..." : "No notifications"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                !notification.isRead
                  ? "border-l-4 border-l-blue-500 bg-blue-50/50"
                  : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="mt-0.5">{getTypeIcon(notification.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm ${
                      !notification.isRead ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {notification.title}
                  </p>
                  <Badge
                    variant={getTypeBadgeVariant(notification.type)}
                    className="text-[10px]"
                  >
                    {notification.type}
                  </Badge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {timeAgo(notification.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
