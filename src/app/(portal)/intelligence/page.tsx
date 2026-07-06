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
  Network,
  Building2,
  MapPin,
  Boxes,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  getSkuPriceDetail,
  getKnowledgeInsights,
  getVendor360,
  getKnowledgeVendors,
  getSupplierRiskScores,
} from "@/actions/intelligence.actions";

const money = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN")}`;

type Tab =
  | "consolidation"
  | "benchmarking"
  | "recommendations"
  | "knowledge"
  | "risk";

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
            ["knowledge", "Knowledge Graph"],
            ["risk", "Supplier Risk"],
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
      {tab === "knowledge" && <KnowledgeGraph />}
      {tab === "risk" && <SupplierRisk />}
    </div>
  );
}

// ============================================================
// CAPABILITY 16 — SUPPLIER RISK
// ============================================================

const RISK_STYLE: Record<string, { text: string; bg: string; dot: string }> = {
  Critical: { text: "text-red-700", bg: "bg-red-50 border-red-200", dot: "bg-red-600" },
  High: { text: "text-orange-700", bg: "bg-orange-50 border-orange-200", dot: "bg-orange-500" },
  Medium: { text: "text-amber-700", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  Low: { text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
};

function SupplierRisk() {
  const [data, setData] = useState<{
    rows: {
      vendorId: string;
      name: string;
      code: string;
      score: number;
      band: string;
      spendShare: number;
      factors: string[];
    }[];
    summary: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSupplierRiskScores()
      .then((d) => setData(d as never))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <p className="py-10 text-center text-sm text-muted-foreground">Scoring vendors…</p>;

  if (!data || data.rows.length === 0)
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No vendors to score yet"
        hint="Add vendors and record some POs, quotes and deliveries — risk scores build from single-source exposure, spend concentration, GST status, quality and delivery history."
      />
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["Critical", "High", "Medium", "Low"] as const).map((band) => (
          <div key={band} className={cn("rounded-lg border p-4", RISK_STYLE[band].bg)}>
            <div className={cn("text-2xl font-bold", RISK_STYLE[band].text)}>
              {data.summary[band] ?? 0}
            </div>
            <div className="text-xs font-medium text-muted-foreground">{band} risk</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendor risk register</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.rows.map((r) => (
              <div key={r.vendorId} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn("size-2.5 shrink-0 rounded-full", RISK_STYLE[r.band].dot)}
                    />
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.code}
                        {r.spendShare > 0 && ` · ${r.spendShare}% of spend`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-xl font-bold", RISK_STYLE[r.band].text)}>
                      {r.score}
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]", RISK_STYLE[r.band].text)}>
                      {r.band}
                    </Badge>
                  </div>
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {r.factors.map((f) => (
                    <li
                      key={f}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Risk = single-source exposure + spend concentration + missing GST +
            registration status + quality/delivery issues + inactivity.
            Blacklisted vendors are always Critical.
          </p>
        </CardContent>
      </Card>
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
  const [detailId, setDetailId] = useState<string | null>(null);

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
                  <tr
                    key={r.productId}
                    onClick={() => setDetailId(r.productId)}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                  >
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
        {rows.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Tip: click any row for vendor-wise, state-wise and monthly pricing.
          </p>
        )}
        <SkuDetailDialog productId={detailId} onClose={() => setDetailId(null)} />
      </CardContent>
    </Card>
  );
}

// ============================================================
// SKU PRICE DETAIL (drill-down)
// ============================================================

function SkuDetailDialog({
  productId,
  onClose,
}: {
  productId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<{
    product: { name: string; sku: string; uom: string };
    stats: { min: number; max: number; avg: number; median: number; count: number } | null;
    vendorWise: { vendor: string; min: number; avg: number; max: number; count: number; last: number }[];
    stateWise: { state: string; avg: number; count: number }[];
    monthly: { month: string; avg: number; count: number }[];
    alerts: { type: string; message: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setData(null);
    getSkuPriceDetail(productId)
      .then((d) => setData(d as never))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [productId]);

  return (
    <Dialog open={!!productId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {data ? `${data.product.name} · ${data.product.sku}` : "Price detail"}
          </DialogTitle>
        </DialogHeader>
        {loading || !data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : !data.stats ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No pricing data.
          </p>
        ) : (
          <div className="space-y-5">
            {/* headline stats */}
            <div className="grid grid-cols-4 gap-2 text-center">
              {(
                [
                  ["Lowest", data.stats.min, "text-emerald-600"],
                  ["Average", data.stats.avg, ""],
                  ["Median", data.stats.median, ""],
                  ["Highest", data.stats.max, "text-red-600"],
                ] as const
              ).map(([label, val, cls]) => (
                <div key={label} className="rounded-lg border p-2">
                  <div className={`text-sm font-bold ${cls}`}>{money(val)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* alerts */}
            {data.alerts.length > 0 && (
              <div className="space-y-2">
                {data.alerts.map((a) => (
                  <div
                    key={a.message}
                    className="flex gap-2 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-900"
                  >
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>{a.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* vendor-wise */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vendor-wise pricing
              </h4>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-3 py-1.5">Vendor</th>
                      <th className="px-3 py-1.5">Lowest</th>
                      <th className="px-3 py-1.5">Average</th>
                      <th className="px-3 py-1.5">Last</th>
                      <th className="px-3 py-1.5">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.vendorWise.map((v) => (
                      <tr key={v.vendor} className="border-b last:border-0">
                        <td className="px-3 py-1.5 font-medium">{v.vendor}</td>
                        <td className="px-3 py-1.5 text-emerald-600">{money(v.min)}</td>
                        <td className="px-3 py-1.5">{money(v.avg)}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{money(v.last)}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{v.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* state-wise */}
            {data.stateWise.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  State-wise pricing (from POs)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.stateWise.map((s) => (
                    <div key={s.state} className="rounded-lg border px-3 py-1.5 text-sm">
                      <span className="font-medium">{s.state}</span>{" "}
                      <span className="text-muted-foreground">
                        {money(s.avg)} · {s.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* monthly trend */}
            {data.monthly.length > 1 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Monthly average
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.monthly.map((m) => (
                    <div key={m.month} className="rounded-lg border px-2.5 py-1 text-xs">
                      <span className="text-muted-foreground">{m.month}</span>{" "}
                      <span className="font-medium">{money(m.avg)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// CAPABILITY 5 — KNOWLEDGE GRAPH
// ============================================================

function KnowledgeGraph() {
  const [insights, setInsights] = useState<{
    widestRange: { vendorId: string; vendor: string; count: number }[];
    mostWarehouses: { vendorId: string; vendor: string; count: number }[];
    mostCategories: { vendorId: string; vendor: string; count: number }[];
    rateSpread: { productId: string; name: string; sku: string; min: number; max: number; spreadPct: number; vendorCount: number }[];
  } | null>(null);
  const [vendors, setVendors] = useState<{ id: string; name: string; code: string }[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [profile, setProfile] = useState<{
    vendor: { name: string; code: string; city: string | null; state: string | null; preferenceStatus: string };
    products: { name: string; sku: string; category: string; rate: number | null }[];
    categories: string[];
    warehouses: { name: string; state: string }[];
    states: string[];
    poCount: number;
    quoteCount: number;
  } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    getKnowledgeInsights()
      .then((d) => setInsights(d as never))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
    getKnowledgeVendors()
      .then((v) => setVendors(v as never))
      .catch(() => {});
  }, []);

  async function pickVendor(id: string) {
    setVendorId(id);
    if (!id) {
      setProfile(null);
      return;
    }
    setLoadingProfile(true);
    try {
      const p = await getVendor360(id);
      setProfile(p as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoadingProfile(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Smart insights */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <InsightCard
          icon={Boxes}
          title="Widest product range"
          rows={insights?.widestRange}
          suffix="products"
        />
        <InsightCard
          icon={Building2}
          title="Most warehouses served"
          rows={insights?.mostWarehouses}
          suffix="warehouses"
        />
        <InsightCard
          icon={Layers}
          title="Most categories covered"
          rows={insights?.mostCategories}
          suffix="categories"
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="size-4 text-[#F47B20]" />
              Same SKU, different rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!insights ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : insights.rateSpread.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enough data.</p>
            ) : (
              <ul className="space-y-2">
                {insights.rateSpread.map((r) => (
                  <li key={r.productId} className="text-sm">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {money(r.min)}–{money(r.max)} · {Math.round(r.spreadPct)}% spread ·{" "}
                      {r.vendorCount} vendors
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vendor 360 explorer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="size-4 text-[#F47B20]" />
            Vendor 360° — explore everything connected to a vendor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <select
            value={vendorId}
            onChange={(e) => pickVendor(e.target.value)}
            className="h-9 w-full max-w-sm rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Select a vendor…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.code})
              </option>
            ))}
          </select>

          {loadingProfile ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : !profile ? (
            <EmptyState
              icon={Network}
              title="Pick a vendor"
              hint="See every SKU, category, warehouse and state connected to a vendor, plus their PO and quote activity."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Products" value={profile.products.length} />
                <Stat label="Categories" value={profile.categories.length} />
                <Stat label="Warehouses" value={profile.warehouses.length} />
                <Stat label="POs / Quotes" value={`${profile.poCount} / ${profile.quoteCount}`} />
              </div>

              {profile.states.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="mr-1 inline size-3.5" />
                    States supplied
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.states.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.categories.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Categories
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.categories.map((c) => (
                      <Badge key={c} variant="outline">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Products supplied
                </h4>
                {profile.products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="px-3 py-1.5">Product</th>
                          <th className="px-3 py-1.5">Category</th>
                          <th className="px-3 py-1.5">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.products.map((p, i) => (
                          <tr key={`${p.name}-${i}`} className="border-b last:border-0">
                            <td className="px-3 py-1.5 font-medium">{p.name}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{p.category}</td>
                            <td className="px-3 py-1.5">
                              {p.rate != null ? money(p.rate) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  title,
  rows,
  suffix,
}: {
  icon: React.ElementType;
  title: string;
  rows?: { vendorId: string; vendor: string; count: number }[];
  suffix: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="size-4 text-[#F47B20]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!rows ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not enough data.</p>
        ) : (
          <ol className="space-y-1.5">
            {rows.map((r, i) => (
              <li key={r.vendorId} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{i + 1}.</span>
                  {r.vendor}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {r.count} {suffix}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
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
