"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ShoppingCart, IndianRupee, Users } from "lucide-react";
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
  getProcurementStats,
  getProcurementTrends,
  getSpendByCategory,
  getTopVendors,
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

export default function ProcurementAnalyticsPage() {
  const [stats, setStats] = useState<{
    totalRfqs: number;
    totalPos: number;
    avgPoValue: number;
    activeVendors: number;
  } | null>(null);
  const [trends, setTrends] = useState<{ month: string; spend: number }[]>([]);
  const [categorySpend, setCategorySpend] = useState<{ name: string; value: number }[]>([]);
  const [topVendors, setTopVendors] = useState<{ name: string; spend: number; poCount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [s, t, c, v] = await Promise.all([
          getProcurementStats(),
          getProcurementTrends(),
          getSpendByCategory(),
          getTopVendors(),
        ]);
        setStats(s);
        setTrends(t);
        setCategorySpend(c);
        setTopVendors(v);
      } catch (error) {
        console.error("Failed to load procurement analytics:", error);
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
          title="Procurement Analytics"
          description="Analyze procurement spend, trends and vendor performance."
        />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Procurement Analytics"
        description="Analyze procurement spend, trends and vendor performance."
      />

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total RFQs"
          value={String(stats?.totalRfqs ?? 0)}
          icon={FileText}
          trend="neutral"
        />
        <StatsCard
          title="Total POs"
          value={String(stats?.totalPos ?? 0)}
          icon={ShoppingCart}
          trend="neutral"
        />
        <StatsCard
          title="Avg PO Value"
          value={`₹${formatINR(stats?.avgPoValue ?? 0)}`}
          icon={IndianRupee}
          trend="neutral"
        />
        <StatsCard
          title="Active Vendors"
          value={String(stats?.activeVendors ?? 0)}
          icon={Users}
          trend="neutral"
        />
      </div>

      {/* Monthly Spend Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spend Trend (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v) => {
                    const [, m] = v.split("-");
                    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return months[parseInt(m, 10) - 1] ?? v;
                  }}
                  fontSize={12}
                />
                <YAxis tickFormatter={(v) => formatINR(v)} fontSize={12} />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Spend"]}
                  labelFormatter={(label) => {
                    const [y, m] = String(label).split("-");
                    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return `${months[parseInt(m, 10) - 1]} ${y}`;
                  }}
                />
                <Bar dataKey="spend" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Spend by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Spend by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {categorySpend.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No category data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySpend}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) =>
                        `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                      labelLine
                    >
                      {categorySpend.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Spend"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Vendors by Spend */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Vendors by Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {topVendors.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No vendor data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topVendors} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatINR(v)} fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      fontSize={12}
                      tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + "..." : v}
                    />
                    <Tooltip
                      formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Spend"]}
                    />
                    <Bar dataKey="spend" fill="#16a34a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
