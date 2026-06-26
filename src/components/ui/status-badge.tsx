"use client";

import { cn } from "@/lib/utils";

type StatusColorMap = Record<string, { bg: string; text: string; border: string }>;

const STATUS_COLORS: StatusColorMap = {
  // Gray - Draft / Pending
  DRAFT: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", border: "border-gray-200 dark:border-gray-700" },
  PENDING: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", border: "border-gray-200 dark:border-gray-700" },

  // Blue - Active / In Progress
  SUBMITTED: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  IN_PROGRESS: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  PUBLISHED: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  PENDING_APPROVAL: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  UNDER_REVIEW: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  ACKNOWLEDGED: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  RECEIVED: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },

  // Green - Success / Complete
  APPROVED: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  ACCEPTED: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  DELIVERED: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  COMPLETED: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  PAID: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  MATCHED: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  FULLY_DELIVERED: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  FULLY_RESPONDED: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  VERIFIED: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  CONVERTED: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },

  // Red - Rejected / Cancelled / Error
  REJECTED: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
  CANCELLED: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
  DISCREPANCY: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
  MISMATCH: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
  FAILED: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
  BLACKLISTED: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
  EXPIRED: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },

  // Amber/Yellow - In Transit / Sent
  SENT: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  IN_TRANSIT: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  DISPATCHED: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  SCHEDULED: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  PROCESSING: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },

  // Orange - Partial
  PARTIALLY_DELIVERED: { bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
  PARTIALLY_PAID: { bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
  PARTIALLY_RESPONDED: { bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
  ESCALATED: { bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
};

const DEFAULT_COLORS = {
  bg: "bg-gray-100 dark:bg-gray-800",
  text: "text-gray-700 dark:text-gray-300",
  border: "border-gray-200 dark:border-gray-700",
};

function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] ?? DEFAULT_COLORS;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {formatStatus(status)}
    </span>
  );
}
