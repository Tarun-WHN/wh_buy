"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, Warehouse, Users, ShoppingCart } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  getDashboardStats,
  getSpendByWarehouse,
  getSpendByVendor,
} from "@/actions/analytics.actions";

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#ea580c",
  "#9333ea",
  "#e11d48",
  "#0891b2",
  "#ca8a04",
  "#4f46e5",
  "#be185d",
  "#15803d",
];

function formatINR(value: number): string {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

export default function ManagementDashboardPage() {
  const [dashStats, setDashStats] = useState<{
    totalSpend: number;
    openRfqs: number;
    openPos: number;
    pendingApprovals: number;
  } | null>(null);
  const [warehouseSpend, setWarehouseSpend] = useState<{ name: string; value: number }[]>([]);
  const [vendorSpend, setVendorSpend] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ds, ws, vs] = await Promise.all([
          getDashboardStats(),
          getSpendByWarehouse(),
          getSpendByVendor(),
        ]);
        setDashStats(ds);
        setWarehouseSpend(ws);
        setVendorSpend(vs);
      } catch (error) {
        console.error("Failed to load management dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Management Dashboard"
          description="Executive view of procurement performance."
        />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Management Dashboard"
        description="Executive view of procurement performance."
      />

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Spend"
          value={`₹${formatINR(dashStats?.totalSpend ?? 0)}`}
          description="All active purchase orders"
          icon={IndianRupee}
          trend="neutral"
        />
        <StatsCard
          title="Open RFQs"
          value={String(dashStats?.openRfqs ?? 0)}
          icon={Users}
          trend="neutral"
        />
        <StatsCard
          title="Open POs"
          value={String(dashStats?.openPos ?? 0)}
          icon={ShoppingCart}
          trend="neutral"
        />
        <StatsCard
          title="Warehouses"
          value={String(warehouseSpend.length)}
          description="With purchase activity"
          icon={Warehouse}
          trend="neutral"
        />
      </div>

      {/* Spend by Warehouse */}
      <Card>
        <CardHeader>
          <CardTitle>Spend by Warehouse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {warehouseSpend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No warehouse data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={warehouseSpend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + "..." : v}
                  />
                  <YAxis tickFormatter={(v) => formatINR(v)} fontSize={12} />
                  <Tooltip
                    formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Spend"]}
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Spend by Vendor (Top 10) */}
      <Card>
        <CardHeader>
          <CardTitle>Spend by Vendor (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            {vendorSpend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No vendor data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vendorSpend}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, percent }) => {
                      const n = name ?? "";
                      return `${n.length > 12 ? n.slice(0, 12) + "..." : n} (${((percent ?? 0) * 100).toFixed(0)}%)`;
                    }}
                    labelLine
                  >
                    {vendorSpend.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Spend"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
