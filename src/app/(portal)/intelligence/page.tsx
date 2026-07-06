"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Search,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getVendorConsolidation,
  getSkuBenchmarks,
  getVendorRecommendations,
  getIntelligenceProducts,
} from "@/actions/intelligence.actions";

const money = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

type Tab = "consolidation" | "benchmarking" | "recommendations";

export default function IntelligencePage() {
  const [tab, setTab] = useState<Tab>("consolidation");

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Procurement Intelligence"
        description="AI-driven insights from your quotes, POs and price history — consolidation, benchmarking and vendor recommendations."
      />

      <div className="inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1 text-sm">
        {(
          [
            ["consolidation", "Vendor Consolidation"],
            ["benchmarking", "Price Benchmarking"],
            ["recommendations", "Vendor Recommendations"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-md px-3 py-1 font-medium transition-colors",
              tab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "consolidation" && <Consolidation />}
      {tab === "benchmarking" && <Benchmarking />}
      {tab === "recommendations" && <Recommendations />}
    </div>
  );
}

// ============================================================
// CONSOLIDATION
// ============================================================

function Consolidation() {
  const [data, setData] = useState<{
    rows: {
      productId: string;
      name: string;
      sku: string;
      category: string;
      vendorCount: number;
      totalSpend: number;
      estSavings: number;
      suggestedVendor: string;
    }[];
    totalOpportunity: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVendorConsolidation()
      .then((d) => setData(d as never))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <p className="py-10 text-center text-sm text-muted-foreground">Analysing…</p>;

  if (!data || data.rows.length === 0)
    return (
      <EmptyState
        icon={Layers}
        title="No consolidation opportunities yet"
        hint="Once the same product is bought from two or more vendors, we'll surface consolidation opportunities and estimated savings here."
      />
    );

  return (
    <div className="space-y-4">
      <Card className="border-[#F47B20]/30 bg-[#F47B20]/5">
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#F47B20]/15 text-[#F47B20]">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Estimated annual consolidation opportunity
            </p>
            <p className="text-2xl font-bold text-[#F47B20]">
              {money(data.totalOpportunity)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Products supplied by multiple vendors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Vendors</th>
                  <th className="px-3 py-2 font-medium">Total Spend</th>
                  <th className="px-3 py-2 font-medium">Est. Savings</th>
                  <th className="px-3 py-2 font-medium">Suggested Vendor</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.productId} className="border-b last:border-0">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.sku}</div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.category}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="secondary">{r.vendorCount}</Badge>
                    </td>
                    <td className="px-3 py-2.5">{money(r.totalSpend)}</td>
                    <td className="px-3 py-2.5 font-medium text-emerald-600">
                      {money(r.estSavings)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <Trophy className="size-3.5 text-[#F47B20]" />
                        {r.suggestedVendor}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Savings estimate assumes each purchase made at the lowest observed
            rate for that product. Consolidation reduces admin overhead but
            increases single-source risk — review before acting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// BENCHMARKING
// ============================================================

function Benchmarking() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<
    {
      productId: string;
      name: string;
      sku: string;
      uom: string;
      min: number;
      max: number;
      avg: number;
      median: number;
      dataPoints: number;
      vendorCount: number;
      trendPct: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const r = await getSkuBenchmarks(q);
      setRows(r as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Market price benchmarks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or product…"
            className="pl-8"
          />
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No pricing data yet"
            hint="Benchmarks build automatically as quotes, POs and vendor rates are recorded."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Lowest</th>
                  <th className="px-3 py-2 font-medium">Average</th>
                  <th className="px-3 py-2 font-medium">Median</th>
                  <th className="px-3 py-2 font-medium">Highest</th>
                  <th className="px-3 py-2 font-medium">Trend</th>
                  <th className="px-3 py-2 font-medium">Vendors</th>
                  <th className="px-3 py-2 font-medium">Data pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.productId} className="border-b last:border-0">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.sku}</div>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-emerald-600">
                      {money(r.min)}
                    </td>
                    <td className="px-3 py-2.5">{money(r.avg)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {money(r.median)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {money(r.max)}
                    </td>
                    <td className="px-3 py-2.5">
                      {Math.abs(r.trendPct) < 1 ? (
                        <span className="text-muted-foreground">Stable</span>
                      ) : r.trendPct > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <TrendingUp className="size-3.5" />
                          {Math.round(r.trendPct)}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <TrendingDown className="size-3.5" />
                          {Math.round(Math.abs(r.trendPct))}%
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{r.vendorCount}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {r.dataPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// RECOMMENDATIONS
// ============================================================

function Recommendations() {
  const [products, setProducts] = useState<
    { id: string; name: string; sku: string }[]
  >([]);
  const [productSearch, setProductSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(
    null
  );
  const [recs, setRecs] = useState<
    {
      vendorId: string;
      name: string;
      code: string;
      preferenceStatus: string;
      avgPrice: number;
      score: number;
      reasons: string[];
    }[]
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      getIntelligenceProducts(productSearch || undefined)
        .then((p) => setProducts(p as never))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [productSearch]);

  async function pick(p: { id: string; name: string }) {
    setSelected(p);
    setLoading(true);
    try {
      const res = await getVendorRecommendations(p.id);
      setRecs(res.recommendations as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pick a SKU</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search product…"
              className="pl-8"
            />
          </div>
          <div className="max-h-[420px] space-y-1 overflow-y-auto">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p)}
                className={cn(
                  "flex w-full flex-col rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  selected?.id === p.id && "border-[#F47B20] bg-[#F47B20]/5"
                )}
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.sku}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selected ? `Recommended vendors — ${selected.name}` : "Recommendations"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selected ? (
            <EmptyState
              icon={Sparkles}
              title="Select a SKU"
              hint="Pick a product to see vendors ranked by price, reliability, experience and preference — each with the reasons behind its rank."
            />
          ) : loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ranking vendors…
            </p>
          ) : recs.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No vendor data for this SKU yet"
              hint="Add a vendor + rate on the product page, or record a quote/PO, and recommendations will appear."
            />
          ) : (
            <div className="space-y-3">
              {recs.map((r, i) => (
                <div
                  key={r.vendorId}
                  className={cn(
                    "rounded-lg border p-4",
                    i === 0 && "border-[#F47B20]/40 bg-[#F47B20]/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {i === 0 && <Trophy className="size-4 text-[#F47B20]" />}
                      <div>
                        <p className="font-semibold">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.code} · avg {money(r.avgPrice)}
                          {r.preferenceStatus === "PREFERRED" && " · Preferred"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          "text-xl font-bold",
                          r.score >= 80
                            ? "text-emerald-600"
                            : r.score >= 60
                              ? "text-amber-600"
                              : "text-muted-foreground"
                        )}
                      >
                        {r.score}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Score
                      </div>
                    </div>
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {r.reasons.map((reason) => (
                      <li
                        key={reason}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// SHARED
// ============================================================

function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ElementType;
  title: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-dashed py-12 text-center">
      <Icon className="mx-auto size-8 text-muted-foreground/50" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
