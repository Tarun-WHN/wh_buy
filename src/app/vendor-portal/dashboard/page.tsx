"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, ShoppingCart, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getVendorDashboard } from "./actions";

// ============================================================
// TYPES
// ============================================================

interface DashboardData {
  pendingRfqs: number;
  activePOs: number;
  pendingPayments: number;
  recentRfqs: {
    id: string;
    rfqId: string;
    rfqNumber: string;
    rfqTitle: string;
    status: string;
    deadline: string | null;
    itemCount: number;
  }[];
  recentPOs: {
    id: string;
    number: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    warehouseName: string;
  }[];
}

// ============================================================
// PAGE
// ============================================================

export default function VendorDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getVendorDashboard();
        setData(result as unknown as DashboardData);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load dashboard"
        );
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Dashboard"
        description="Overview of your activity"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending RFQs</p>
                <p className="text-2xl font-bold">
                  {data?.pendingRfqs ?? "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active POs</p>
                <p className="text-2xl font-bold">
                  {data?.activePOs ?? "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Pending Payments
                </p>
                <p className="text-2xl font-bold">
                  {data?.pendingPayments ?? "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent RFQs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent RFQs</CardTitle>
            <Link
              href="/vendor-portal/rfqs"
              className="text-xs text-primary hover:underline"
            >
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {!data || data.recentRfqs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {isPending ? "Loading..." : "No pending RFQs"}
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentRfqs.map((rfq) => (
                  <div
                    key={rfq.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <Link
                        href={`/vendor-portal/rfqs/${rfq.rfqId}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {rfq.rfqNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {rfq.rfqTitle} | {rfq.itemCount} items
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={rfq.status} />
                      {rfq.deadline && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due: {formatDate(rfq.deadline)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent POs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <Link
              href="/vendor-portal/orders"
              className="text-xs text-primary hover:underline"
            >
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {!data || data.recentPOs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {isPending ? "Loading..." : "No recent orders"}
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentPOs.map((po) => (
                  <div
                    key={po.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <Link
                        href={`/vendor-portal/orders/${po.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {po.number}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {po.warehouseName} |{" "}
                        {formatDate(po.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={po.status} />
                      <p className="mt-1 text-xs font-medium">
                        {formatCurrency(po.totalAmount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
