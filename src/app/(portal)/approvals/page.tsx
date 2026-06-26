"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, formatCurrency, formatDateTime } from "@/lib/utils";
import { ApprovalActionButtons } from "@/components/approval/approval-action";
import { getPendingApprovals, getMyApprovalHistory } from "@/actions/approval.actions";

// ============================================================
// TYPES
// ============================================================

interface PendingApproval {
  id: string;
  entity: string;
  entityId: string;
  status: string;
  currentLevel: number;
  totalAmount: number;
  createdAt: string;
  requirement: {
    id: string;
    number: string;
    title: string;
    createdBy: { name: string };
  } | null;
  purchaseOrder: {
    id: string;
    number: string;
    totalAmount: number;
    vendor: { name: string };
    createdBy: { name: string };
  } | null;
}

interface HistoryAction {
  id: string;
  level: number;
  action: string;
  comments: string | null;
  actionAt: string;
  approval: {
    entity: string;
    entityId: string;
    status: string;
    totalAmount: number;
    requirement: {
      id: string;
      number: string;
      title: string;
    } | null;
    purchaseOrder: {
      id: string;
      number: string;
      totalAmount: number;
      vendor: { name: string };
    } | null;
  };
}

// ============================================================
// PAGE
// ============================================================

export default function ApprovalsPage() {
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    startTransition(async () => {
      try {
        const [pendingData, historyData] = await Promise.all([
          getPendingApprovals(),
          getMyApprovalHistory(),
        ]);
        setPending(pendingData as unknown as PendingApproval[]);
        setHistory(historyData as unknown as HistoryAction[]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load approvals"
        );
      }
    });
  }

  function getEntityLabel(approval: PendingApproval) {
    if (approval.purchaseOrder) {
      return {
        type: "Purchase Order",
        number: approval.purchaseOrder.number,
        href: `/purchase-orders/${approval.purchaseOrder.id}`,
        requester: approval.purchaseOrder.createdBy.name,
        detail: approval.purchaseOrder.vendor.name,
        amount: approval.purchaseOrder.totalAmount,
      };
    }
    if (approval.requirement) {
      return {
        type: "Requirement",
        number: approval.requirement.number,
        href: `/requirements/${approval.requirement.id}`,
        requester: approval.requirement.createdBy.name,
        detail: approval.requirement.title,
        amount: approval.totalAmount,
      };
    }
    return {
      type: approval.entity,
      number: approval.entityId,
      href: "#",
      requester: "-",
      detail: "-",
      amount: approval.totalAmount,
    };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Review and approve pending items"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4" />
          {pending.length} pending
        </div>
      </PageHeader>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* PENDING TAB */}
        {/* ============================================================ */}
        <TabsContent value="pending">
          {pending.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {isPending
                  ? "Loading..."
                  : "No pending approvals. You are all caught up!"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pending.map((approval) => {
                const entity = getEntityLabel(approval);

                return (
                  <Card key={approval.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium uppercase text-muted-foreground">
                              {entity.type}
                            </span>
                            <StatusBadge status={approval.status} />
                            <span className="text-xs text-muted-foreground">
                              Level {approval.currentLevel}
                            </span>
                          </div>
                          <div>
                            <Link
                              href={entity.href}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {entity.number}
                            </Link>
                            <span className="ml-2 text-sm text-muted-foreground">
                              {entity.detail}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Requester: {entity.requester}</span>
                            <span>Amount: {formatCurrency(entity.amount)}</span>
                            <span>
                              Date: {formatDate(approval.createdAt)}
                            </span>
                          </div>
                        </div>

                        <ApprovalActionButtons
                          approvalId={approval.id}
                          onComplete={loadData}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ============================================================ */}
        {/* HISTORY TAB */}
        {/* ============================================================ */}
        <TabsContent value="history">
          {history.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                {isPending ? "Loading..." : "No approval history found."}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const entity = item.approval.purchaseOrder
                  ? {
                      type: "Purchase Order",
                      number: item.approval.purchaseOrder.number,
                      href: `/purchase-orders/${item.approval.purchaseOrder.id}`,
                      detail: item.approval.purchaseOrder.vendor.name,
                    }
                  : item.approval.requirement
                    ? {
                        type: "Requirement",
                        number: item.approval.requirement.number,
                        href: `/requirements/${item.approval.requirement.id}`,
                        detail: item.approval.requirement.title,
                      }
                    : {
                        type: item.approval.entity,
                        number: item.approval.entityId,
                        href: "#",
                        detail: "-",
                      };

                return (
                  <Card key={item.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium uppercase text-muted-foreground">
                              {entity.type}
                            </span>
                            <StatusBadge status={item.action} />
                          </div>
                          <div>
                            <Link
                              href={entity.href}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {entity.number}
                            </Link>
                            <span className="ml-2 text-sm text-muted-foreground">
                              {entity.detail}
                            </span>
                          </div>
                          {item.comments && (
                            <p className="text-xs text-muted-foreground">
                              {item.comments}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>Level {item.level}</div>
                          <div>{formatDateTime(item.actionAt)}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
