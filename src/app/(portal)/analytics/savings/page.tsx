"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, TrendingDown, Percent } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSavingsData } from "@/actions/analytics.actions";

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function SavingsTrackerPage() {
  const [data, setData] = useState<{
    totalSavings: number;
    totalPotentialSpend: number;
    savingsPercent: number;
    details: {
      productName: string;
      avgPrice: number;
      poPrice: number;
      quantity: number;
      savings: number;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await getSavingsData();
        setData(result);
      } catch (error) {
        console.error("Failed to load savings data:", error);
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
          title="Savings Tracker"
          description="Track cost savings achieved through procurement."
        />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading savings data...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Savings Tracker"
        description="Track cost savings achieved through procurement."
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total Savings"
          value={formatINR(data?.totalSavings ?? 0)}
          description="Compared to historical avg prices"
          icon={TrendingDown}
          trend="down"
        />
        <StatsCard
          title="Savings %"
          value={`${data?.savingsPercent ?? 0}%`}
          description="Of total potential spend"
          icon={Percent}
          trend="neutral"
        />
        <StatsCard
          title="Total Potential Spend"
          value={formatINR(data?.totalPotentialSpend ?? 0)}
          description="At historical avg prices"
          icon={IndianRupee}
          trend="neutral"
        />
      </div>

      {/* Savings Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Savings by Product</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.details && data.details.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Avg Historical Price</TableHead>
                    <TableHead className="text-right">PO Price</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Savings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.details.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-right">{formatINR(item.avgPrice)}</TableCell>
                      <TableCell className="text-right">{formatINR(item.poPrice)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        {formatINR(item.savings)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No savings data available. Savings are calculated by comparing PO prices to historical average prices.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
