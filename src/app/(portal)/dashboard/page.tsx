import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IndianRupee,
  FileText,
  ShoppingCart,
  ShieldCheck,
  Plus,
  ArrowRight,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { getDashboardStats, getRecentActivity } from "@/actions/analytics.actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name ?? "User";
  const userRole = session?.user?.role ?? "";

  const [stats, activity] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(),
  ]);

  const canCreateRequirement = hasPermission(userRole, PERMISSIONS.REQUIREMENT_CREATE);
  const canCreateRfq = hasPermission(userRole, PERMISSIONS.RFQ_CREATE);
  const canCreatePo = hasPermission(userRole, PERMISSIONS.PO_CREATE);

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-[#1B2A4A] to-[#2d4470] p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {userName}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Here is an overview of your procurement activity.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-[#F47B20]" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Spend"
          value={formatCurrency(stats.totalSpend)}
          description="All active POs"
          icon={IndianRupee}
          trend="neutral"
          accent="#F47B20"
        />
        <StatsCard
          title="Open RFQs"
          value={String(stats.openRfqs)}
          description="Awaiting responses"
          icon={FileText}
          trend="neutral"
          accent="#3B82F6"
        />
        <StatsCard
          title="Open POs"
          value={String(stats.openPos)}
          description="In progress"
          icon={ShoppingCart}
          trend="neutral"
          accent="#8B5CF6"
        />
        <StatsCard
          title="Pending Approvals"
          value={String(stats.pendingApprovals)}
          description="Require action"
          icon={ShieldCheck}
          trend={stats.pendingApprovals > 0 ? "up" : "neutral"}
          accent="#10B981"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {canCreateRequirement && (
            <Link href="/requirements/new">
              <Card className="group cursor-pointer border-dashed transition-all hover:border-solid hover:border-primary/30 hover:shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">New Requirement</p>
                    <p className="text-xs text-muted-foreground">
                      Create a purchase requirement
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {canCreateRfq && (
            <Link href="/rfq/new">
              <Card className="group cursor-pointer border-dashed transition-all hover:border-solid hover:border-primary/30 hover:shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F47B20]/10">
                    <FileText className="h-5 w-5 text-[#F47B20]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">New RFQ</p>
                    <p className="text-xs text-muted-foreground">
                      Send a request for quotation
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {canCreatePo && (
            <Link href="/purchase-orders/new">
              <Card className="group cursor-pointer border-dashed transition-all hover:border-solid hover:border-primary/30 hover:shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">New PO</p>
                    <p className="text-xs text-muted-foreground">
                      Create a purchase order
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent POs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Purchase Orders</CardTitle>
            <Link href="/purchase-orders">
              <Button variant="ghost" size="sm" className="text-xs">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {activity.pos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No purchase orders yet</p>
                </div>
              )}
              {activity.pos.map((po) => (
                <Link
                  key={po.id}
                  href={`/purchase-orders/${po.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm transition-all hover:bg-accent/50 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-sm">{po.number}</span>
                    <span className="text-xs text-muted-foreground">
                      {po.vendor.name} &middot; {formatDate(po.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {formatCurrency(po.totalAmount)}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {po.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent RFQs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent RFQs</CardTitle>
            <Link href="/rfq">
              <Button variant="ghost" size="sm" className="text-xs">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {activity.rfqs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No RFQs yet</p>
                </div>
              )}
              {activity.rfqs.map((rfq) => (
                <Link
                  key={rfq.id}
                  href={`/rfq/${rfq.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm transition-all hover:bg-accent/50 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-sm">{rfq.number}</span>
                    <span className="text-xs text-muted-foreground">
                      {rfq.title} &middot; {formatDate(rfq.createdAt)}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {rfq.status.replace(/_/g, " ")}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
