"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Search, Plus, Trash2, Sparkles, Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getIntelligenceProducts, suggestRfqVendors } from "@/actions/intelligence.actions";
import { createRfq } from "@/actions/rfq.actions";

interface Sku {
  id: string;
  name: string;
  sku: string;
  uom?: string;
  specifications?: string | null;
  quantity: string;
}
interface VendorRec {
  vendorId: string;
  name: string;
  code: string;
  coversCount: number;
  coverage: number;
  preferenceStatus: string;
  score: number;
  reasons: string[];
}

export default function GenerateRfqPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    { id: string; name: string; sku: string; uom?: string; specifications?: string | null }[]
  >([]);
  const [selected, setSelected] = useState<Sku[]>([]);
  const [recs, setRecs] = useState<VendorRec[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [suggesting, setSuggesting] = useState(false);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [location, setLocation] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      getIntelligenceProducts(search || undefined)
        .then((p) => setResults(p as never))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  function addSku(p: { id: string; name: string; sku: string; uom?: string; specifications?: string | null }) {
    if (selected.some((s) => s.id === p.id)) return;
    setSelected((prev) => [...prev, { ...p, quantity: "1" }]);
    setRecs([]);
  }
  function removeSku(id: string) {
    setSelected((prev) => prev.filter((s) => s.id !== id));
    setRecs([]);
  }
  function setQty(id: string, q: string) {
    setSelected((prev) => prev.map((s) => (s.id === id ? { ...s, quantity: q } : s)));
  }

  async function suggest() {
    if (selected.length === 0) {
      toast.error("Add at least one SKU");
      return;
    }
    setSuggesting(true);
    try {
      const r = (await suggestRfqVendors(selected.map((s) => s.id))) as VendorRec[];
      setRecs(r);
      // pre-select vendors covering at least one SKU (top 8)
      setChosen(new Set(r.slice(0, 8).map((v) => v.vendorId)));
      if (r.length === 0)
        toast.message("No vendors on record for these SKUs — add vendor rates on the product pages first.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSuggesting(false);
    }
  }

  function toggleVendor(id: string) {
    setChosen((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function generate() {
    if (selected.length === 0) return toast.error("Add at least one SKU");
    if (chosen.size === 0) return toast.error("Select at least one vendor");
    setGenerating(true);
    try {
      const rfq = await createRfq({
        title: title || `RFQ for ${selected.length} item${selected.length === 1 ? "" : "s"}`,
        rfqType: selected.length > 1 ? "MULTI" : "SINGLE",
        submissionDeadline: deadline || undefined,
        deliveryLocation: location || undefined,
        lineItems: selected.map((s) => ({
          productId: s.id,
          quantity: parseFloat(s.quantity) || 1,
          specifications: s.specifications || undefined,
        })),
        vendorIds: [...chosen],
      });
      toast.success("RFQ generated as draft — review & send");
      router.push(`/rfq/${rfq.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate RFQ");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="AI RFQ Generator"
        description="Pick SKUs, let the system find & rank the right vendors, then generate an editable RFQ."
      >
        <Button variant="outline" render={<Link href="/rfq" />}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back to RFQs
        </Button>
      </PageHeader>

      {/* Step 1: SKUs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">1 · Select SKUs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="pl-8"
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addSku(p)}
                  disabled={selected.some((s) => s.id === p.id)}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-40"
                >
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{p.sku}</span>
                  </span>
                  <Plus className="size-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Selected ({selected.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selected.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Add SKUs from the left — one, several, or a whole BOQ.
              </p>
            ) : (
              <div className="space-y-2">
                {selected.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-md border p-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.sku}</div>
                    </div>
                    <Input
                      type="number"
                      min="0.01"
                      value={s.quantity}
                      onChange={(e) => setQty(s.id, e.target.value)}
                      className="h-8 w-20"
                    />
                    <span className="w-8 text-xs text-muted-foreground">{s.uom}</span>
                    <Button variant="ghost" size="icon-sm" onClick={() => removeSku(s.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="brand"
                  className="mt-2 w-full"
                  onClick={suggest}
                  disabled={suggesting}
                >
                  <Sparkles className="mr-1.5 size-4" />
                  {suggesting ? "Finding vendors…" : "Suggest & rank vendors"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Step 2: Vendors */}
      {recs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">2 · Recommended vendors</CardTitle>
            <p className="text-xs text-muted-foreground">
              Ranked by coverage of your SKUs, preference and reliability. Uncheck any
              you don&apos;t want on the RFQ.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recs.map((v, i) => (
                <label
                  key={v.vendorId}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                    chosen.has(v.vendorId) && "border-[#F47B20]/40 bg-[#F47B20]/5"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={chosen.has(v.vendorId)}
                    onChange={() => toggleVendor(v.vendorId)}
                    className="mt-1 size-4 accent-[#F47B20]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {i === 0 && <Trophy className="size-3.5 text-[#F47B20]" />}
                      <span className="font-medium">{v.name}</span>
                      <span className="text-xs text-muted-foreground">{v.code}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {v.coverage}% coverage
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {v.reasons.map((r) => (
                        <span
                          key={r}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-muted-foreground">
                    {v.score}
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Details + generate */}
      {recs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">3 · RFQ details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2 sm:col-span-1">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`RFQ for ${selected.length} items`}
                />
              </div>
              <div className="grid gap-2">
                <Label>Submission deadline</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Delivery location</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="brand" onClick={generate} disabled={generating}>
                {generating ? "Generating…" : `Generate RFQ (${chosen.size} vendors)`}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Creates a draft RFQ with your SKUs, auto-filled specifications and the
              selected vendors. You can edit and send it (email / vendor portal) from
              the RFQ page, which also tracks Sent / Viewed / Responded / Awarded.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
