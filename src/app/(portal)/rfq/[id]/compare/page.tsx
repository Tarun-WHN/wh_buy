"use client";

import * as React from "react";
import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  FileText,
  ExternalLink,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuoteComparisonMatrix } from "@/components/rfq/quote-comparison-matrix";
import { getRfq, recordVendorQuote, awardQuotation } from "@/actions/rfq.actions";

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

interface LineItem {
  id: string;
  quantity: number;
  targetPrice: number | null;
  product: { id: string; name: string; sku: string; uom: string };
}
interface Quotation {
  id: string;
  number: string;
  revision: number;
  status: string;
  totalAmount: number;
  freight: number;
  filePath: string | null;
  fileName: string | null;
  vendor: { id: string; name: string; code: string; rating: number };
  items: {
    id: string;
    unitPrice: number;
    quantity: number;
    taxPercent: number;
    taxAmount: number;
    totalPrice: number;
    deliveryDays: number | null;
    rfqLineItem: { id: string; product: { id: string; name: string; sku: string } };
  }[];
}
interface RfqData {
  id: string;
  number: string;
  title: string;
  awardedQuotationId: string | null;
  selectionRemarks: string | null;
  lineItems: LineItem[];
  rfqVendors: { vendor: { id: string; name: string; code: string } }[];
  quotations: Quotation[];
}

export default function QuoteComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [rfq, setRfq] = useState<RfqData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRfq((await getRfq(id)) as unknown as RfqData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load RFQ");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !rfq)
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading comparison...
      </div>
    );
  if (!rfq)
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        RFQ not found
      </div>
    );

  const activeQuotations = rfq.quotations.filter(
    (q) => q.status !== "REJECTED" && q.status !== "EXPIRED"
  );
  const latestByVendor = new Map<string, Quotation>();
  for (const q of activeQuotations) {
    const existing = latestByVendor.get(q.vendor.id);
    if (!existing || q.revision > existing.revision) latestByVendor.set(q.vendor.id, q);
  }
  const quotationsToCompare = Array.from(latestByVendor.values());
  const vendorsInComparison = quotationsToCompare.map((q) => q.vendor);
  const awarded = quotationsToCompare.find((q) => q.id === rfq.awardedQuotationId);
  const effectiveVendorId = awarded ? awarded.vendor.id : selectedVendorId;

  return (
    <div className="space-y-6">
      <PageHeader title={`Compare Quotes — ${rfq.number}`} description={rfq.title}>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href={`/rfq/${id}`} />}>
            <ArrowLeft className="mr-1.5 size-4" />
            Back to RFQ
          </Button>
          <RecordQuoteButton rfq={rfq} onDone={load} />
          {effectiveVendorId && (
            <Button
              render={
                <Link href={`/purchase-orders/new?rfqId=${id}&vendorId=${effectiveVendorId}`} />
              }
            >
              <ShoppingCart className="mr-1.5 size-4" />
              Create PO
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Awarded banner */}
      {awarded && (
        <Card className="border-emerald-300/50 bg-emerald-50/60">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Awarded to {awarded.vendor.name} · {money(awarded.totalAmount)}
              </p>
              {rfq.selectionRemarks && (
                <p className="text-sm text-emerald-700">
                  Reason: {rfq.selectionRemarks}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {quotationsToCompare.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No quotes recorded yet. Use <strong>Record Quote</strong> to capture a
            vendor&apos;s quote and attach their PDF.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Quote Comparison Matrix ({quotationsToCompare.length} vendors)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QuoteComparisonMatrix
                lineItems={rfq.lineItems}
                quotations={quotationsToCompare}
                vendors={vendorsInComparison}
                selectedVendorId={effectiveVendorId}
                onSelectVendor={setSelectedVendorId}
              />
            </CardContent>
          </Card>

          {/* Vendor quotes: file + select */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vendor quotes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quotationsToCompare
                  .slice()
                  .sort((a, b) => a.totalAmount - b.totalAmount)
                  .map((q, i) => (
                    <div
                      key={q.id}
                      className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${
                        q.id === rfq.awardedQuotationId
                          ? "border-emerald-300 bg-emerald-50/40"
                          : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {i === 0 && <Trophy className="size-4 text-[#F47B20]" />}
                          <span className="font-medium">{q.vendor.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {q.number} · rev {q.revision}
                          </span>
                          {q.id === rfq.awardedQuotationId && (
                            <Badge variant="outline" className="text-[10px] text-emerald-700">
                              Awarded
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total {money(q.totalAmount)}
                          {q.freight > 0 && ` (incl. freight ${money(q.freight)})`}
                        </div>
                      </div>
                      {q.filePath ? (
                        <a
                          href={q.filePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[#F47B20] hover:underline"
                        >
                          <FileText className="size-4" />
                          Quote
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">No file</span>
                      )}
                      <SelectVendorButton
                        rfqId={rfq.id}
                        quotationId={q.id}
                        vendorName={q.vendor.name}
                        awarded={q.id === rfq.awardedQuotationId}
                        onDone={load}
                      />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================================
// RECORD QUOTE
// ============================================================

function RecordQuoteButton({ rfq, onDone }: { rfq: RfqData; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [freight, setFreight] = useState("");
  const [remarks, setRemarks] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const vendors = rfq.rfqVendors.map((v) => v.vendor);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setFilePath(data.filePath);
      setFileName(data.fileName);
      toast.success("Quote attached");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!vendorId) return toast.error("Select a vendor");
    const items = rfq.lineItems
      .filter((li) => prices[li.id] && Number(prices[li.id]) > 0)
      .map((li) => ({ rfqLineItemId: li.id, unitPrice: Number(prices[li.id]), taxPercent: 0 }));
    if (items.length === 0) return toast.error("Enter a price for at least one item");
    setSaving(true);
    try {
      await recordVendorQuote({
        rfqId: rfq.id,
        vendorId,
        freight: freight ? Number(freight) : 0,
        remarks: remarks || undefined,
        filePath: filePath || undefined,
        fileName: fileName || undefined,
        items,
      });
      toast.success("Quote recorded");
      setOpen(false);
      setVendorId("");
      setPrices({});
      setFreight("");
      setRemarks("");
      setFilePath("");
      setFileName("");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="brand" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 size-4" />
        Record Quote
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record vendor quote</DialogTitle>
            <DialogDescription>
              Enter the vendor&apos;s prices and attach their quote document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>
                Vendor <span className="text-destructive">*</span>
              </Label>
              <Select value={vendorId} onValueChange={(v) => setVendorId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select vendor">
                    {(val) => {
                      const v = vendors.find((x) => x.id === val);
                      return v ? `${v.name} (${v.code})` : "Select vendor";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unit prices (₹)</Label>
              {rfq.lineItems.map((li) => (
                <div key={li.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="truncate font-medium">{li.product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {li.product.sku} · {li.quantity} {li.product.uom}
                    </div>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={prices[li.id] ?? ""}
                    onChange={(e) =>
                      setPrices((p) => ({ ...p, [li.id]: e.target.value }))
                    }
                    className="h-8 w-28"
                    placeholder="rate"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Freight (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={freight}
                  onChange={(e) => setFreight(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Quote document</Label>
              {filePath ? (
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{fileName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilePath("");
                      setFileName("");
                    }}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    remove
                  </button>
                </div>
              ) : (
                <FileUpload
                  onUpload={handleFile}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv,.doc,.docx"
                  label={uploading ? "Uploading…" : "Attach quote"}
                />
              )}
            </div>

            <div className="grid gap-2">
              <Label>Remarks</Label>
              <Textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Payment/delivery terms, notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" onClick={save} disabled={saving || uploading}>
              {saving ? "Saving…" : "Record Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================
// SELECT VENDOR (award with remarks)
// ============================================================

function SelectVendorButton({
  rfqId,
  quotationId,
  vendorName,
  awarded,
  onDone,
}: {
  rfqId: string;
  quotationId: string;
  vendorName: string;
  awarded: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setSaving(true);
    try {
      await awardQuotation(rfqId, quotationId, remarks);
      toast.success(`Awarded to ${vendorName}`);
      setOpen(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        variant={awarded ? "outline" : "default"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {awarded ? "Change" : "Select"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select {vendorName}</DialogTitle>
            <DialogDescription>
              Record why this vendor is being selected.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Reason for selection</Label>
            <Textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. lowest landed cost, best delivery, approved vendor"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" onClick={confirm} disabled={saving}>
              {saving ? "Saving…" : "Confirm selection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
