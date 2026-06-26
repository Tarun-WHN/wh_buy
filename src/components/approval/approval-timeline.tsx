"use client";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils";
import { Check, X, Clock, RotateCcw } from "lucide-react";

// ============================================================
// TYPES
// ============================================================

interface ApprovalActionData {
  id: string;
  level: number;
  action: string;
  comments: string | null;
  actionAt: string;
  actionBy: { id: string; name: string };
}

interface ApprovalTimelineProps {
  actions: ApprovalActionData[];
  currentLevel?: number;
  status?: string;
}

// ============================================================
// HELPERS
// ============================================================

function getActionIcon(action: string) {
  switch (action) {
    case "APPROVED":
      return Check;
    case "REJECTED":
      return X;
    case "RETURNED":
      return RotateCcw;
    default:
      return Clock;
  }
}

function getActionColor(action: string) {
  switch (action) {
    case "APPROVED":
      return {
        dot: "bg-green-500",
        line: "bg-green-200",
        icon: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
      };
    case "REJECTED":
      return {
        dot: "bg-red-500",
        line: "bg-red-200",
        icon: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
      };
    case "RETURNED":
      return {
        dot: "bg-amber-500",
        line: "bg-amber-200",
        icon: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
      };
    default:
      return {
        dot: "bg-blue-500",
        line: "bg-blue-200",
        icon: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
      };
  }
}

// ============================================================
// COMPONENT
// ============================================================

export function ApprovalTimeline({
  actions,
  currentLevel,
  status,
}: ApprovalTimelineProps) {
  if (actions.length === 0 && status === "PENDING") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
          <Clock className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-blue-700">
            Pending Approval - Level {currentLevel ?? 1}
          </p>
          <p className="text-xs text-blue-600">
            Waiting for approver action
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {actions.map((action, index) => {
        const colors = getActionColor(action.action);
        const Icon = getActionIcon(action.action);
        const isLast = index === actions.length - 1;

        return (
          <div key={action.id} className="relative flex gap-4 pb-6">
            {/* Vertical line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-4 top-8 h-full w-0.5 -translate-x-1/2",
                  colors.line
                )}
              />
            )}

            {/* Dot / Icon */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                colors.dot
              )}
            >
              <Icon className="h-4 w-4 text-white" />
            </div>

            {/* Content */}
            <div
              className={cn(
                "flex-1 rounded-lg border p-3",
                colors.bg,
                colors.border
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">
                    Level {action.level} - {action.action}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    by {action.actionBy.name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(action.actionAt)}
                </span>
              </div>
              {action.comments && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {action.comments}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Show pending indicator if still pending after actions */}
      {status === "PENDING" && actions.length > 0 && (
        <div className="relative flex gap-4 pb-6">
          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <span className="text-sm font-medium text-blue-700">
              Pending Approval - Level {currentLevel ?? 1}
            </span>
            <p className="text-xs text-blue-600">
              Waiting for approver action
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
