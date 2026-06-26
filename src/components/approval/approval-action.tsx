"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  approveAction,
  rejectAction,
  returnAction,
} from "@/actions/approval.actions";

// ============================================================
// TYPES
// ============================================================

interface ApprovalActionProps {
  approvalId: string;
  onComplete?: () => void;
}

type ActionType = "approve" | "reject" | "return";

// ============================================================
// COMPONENT
// ============================================================

export function ApprovalActionButtons({
  approvalId,
  onComplete,
}: ApprovalActionProps) {
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [comments, setComments] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  function openDialog(type: ActionType) {
    setActionType(type);
    setComments("");
    setDialogOpen(true);
  }

  function handleConfirm() {
    if (!actionType) return;

    if ((actionType === "reject" || actionType === "return") && !comments.trim()) {
      toast.error("Comments are required");
      return;
    }

    startTransition(async () => {
      try {
        if (actionType === "approve") {
          await approveAction(approvalId, comments || undefined);
          toast.success("Approval granted");
        } else if (actionType === "reject") {
          await rejectAction(approvalId, comments);
          toast.success("Approval rejected");
        } else if (actionType === "return") {
          await returnAction(approvalId, comments);
          toast.success("Returned for revision");
        }

        setDialogOpen(false);
        onComplete?.();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Action failed"
        );
      }
    });
  }

  const actionConfig = {
    approve: {
      title: "Approve",
      description: "Are you sure you want to approve this item?",
      buttonVariant: "default" as const,
      requireComments: false,
    },
    reject: {
      title: "Reject",
      description: "Please provide a reason for rejection.",
      buttonVariant: "destructive" as const,
      requireComments: true,
    },
    return: {
      title: "Return for Revision",
      description: "Please explain what needs to be revised.",
      buttonVariant: "outline" as const,
      requireComments: true,
    },
  };

  const config = actionType ? actionConfig[actionType] : null;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => openDialog("approve")}
          disabled={isPending}
        >
          <Check className="mr-1.5 size-4" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => openDialog("reject")}
          disabled={isPending}
        >
          <X className="mr-1.5 size-4" />
          Reject
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => openDialog("return")}
          disabled={isPending}
        >
          <RotateCcw className="mr-1.5 size-4" />
          Return
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{config?.title}</DialogTitle>
            <DialogDescription>{config?.description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="comments">
                Comments{" "}
                {config?.requireComments && (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Enter your comments..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant={config?.buttonVariant ?? "default"}
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? "Processing..." : `Confirm ${config?.title}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
