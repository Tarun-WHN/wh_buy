"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, FileText, ExternalLink, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getProductVendors,
  getLinkableVendors,
  upsertProductVendor,
  deleteProductVendor,
} from "@/actions/product-vendor.actions";

interface Offer {
  id: string;
  rate: number | null;
  currency: string;
  moq: number | null;
  leadTimeDays: number | null;
  validUntil: string | null;
  quoteFilePath: string | null;
  quoteFileName: string | null;
  remarks: string | null;
  vendor: {
    id: string;
    name: string;
    code: string;
    registrationStatus: string;
  };
}

interface VendorOption {
  id: string;
  name: string;
  code: string;
}

function formatMoney(rate: number | null, currency: string) {
  if (rate == null) return "—";
  return `${currency === "INR" ? "₹" : currency + " "}${rate.toLocaleString(
    "en-IN"
  )}`;
}

export function ProductVendors({
  productId,
  productUom,
}: {
  productId: string;
  productUom?: string;
}) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // form state
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [vendorId, setVendorId] = useState("");
  const [newVendorName, setNewVendorName] = useState("");
  const [rate, setRate] = useState("");
  const [moq, setMoq] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [remarks, setRemarks] = useState("");
  const [quoteFilePath, setQuoteFilePath] = useState("");
  const [quoteFileName, setQuoteFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, v] = await Promise.all([
        getProductVendors(productId),
        getLinkableVendors(productId),
      ]);
      setOffers(o as unknown as Offer[]);
      setVendors(v as VendorOption[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setMode("existing");
    setVendorId("");
    setNewVendorName("");
    setRate("");
    setMoq("");
    setLeadTimeDays("");
    setValidUntil("");
    setRemarks("");
    setQuoteFilePath("");
    setQuoteFileName("");
  }

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setQuoteFilePath(data.filePath);
      setQuoteFileName(data.fileName);
      toast.success("Quote attached");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (mode === "existing" && !vendorId) {
      toast.error("Select a vendor");
      return;
    }
    if (mode === "new" && !newVendorName.trim()) {
      toast.error("Enter the new vendor's name");
      return;
    }
    setSaving(true);
    try {
      await upsertProductVendor({
        productId,
        vendorId: mode === "existing" ? vendorId : undefined,
        newVendorName: mode === "new" ? newVendorName.trim() : undefined,
        rate: rate ? Number(rate) : undefined,
        currency: "INR",
        moq: moq ? Number(moq) : undefined,
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
        validUntil: validUntil || undefined,
        quoteFilePath: quoteFilePath || undefined,
        quoteFileName: quoteFileName || undefined,
        remarks: remarks || undefined,
      });
      toast.success("Vendor pricing saved");
      resetForm();
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, vendorName: string) {
    if (!confirm(`Remove ${vendorName} from this product?`)) return;
    try {
      await deleteProductVendor(id);
      toast.success("Removed");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Vendors & Pricing</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Vendors who can supply this product, their rate and quote.
          </p>
        </div>
        {!showForm && (
          <Button
            type="button"
            variant="brand"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="mr-1.5 size-4" />
            Add Vendor
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Add form */}
        {showForm && (
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Add a vendor offer</h4>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* vendor mode toggle */}
            <div className="mb-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "existing" ? "default" : "outline"}
                onClick={() => setMode("existing")}
              >
                Existing vendor
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "new" ? "default" : "outline"}
                onClick={() => setMode("new")}
              >
                + New vendor
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* vendor selector */}
              <div className="grid gap-2 sm:col-span-2">
                <Label>
                  Vendor <span className="text-destructive">*</span>
                </Label>
                {mode === "existing" ? (
                  <Select
                    value={vendorId}
                    onValueChange={(v) => setVendorId(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select vendor">
                        {(value) => {
                          const v = vendors.find((x) => x.id === value);
                          return v ? `${v.name} (${v.code})` : "Select vendor";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          All vendors already added — use “+ New vendor”.
                        </div>
                      ) : (
                        vendors.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} ({v.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    placeholder="New vendor name (added as Pending)"
                  />
                )}
              </div>

              <div className="grid gap-2">
                <Label>Rate (₹{productUom ? ` / ${productUom}` : ""})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g. 1250"
                />
              </div>
              <div className="grid gap-2">
                <Label>Min order qty</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={moq}
                  onChange={(e) => setMoq(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-2">
                <Label>Lead time (days)</Label>
                <Input
                  type="number"
                  min="0"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-2">
                <Label>Quote valid until</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label>Attach quote (PDF, image, Excel, Word)</Label>
                {quoteFilePath ? (
                  <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{quoteFileName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setQuoteFilePath("");
                        setQuoteFileName("");
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <FileUpload
                    onUpload={handleFile}
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv,.doc,.docx"
                    label={uploading ? "Uploading..." : "Upload quote"}
                  />
                )}
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label>Remarks</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Payment terms, conditions, etc. (optional)"
                  rows={2}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || uploading}
              >
                {saving ? "Saving..." : "Save Vendor Offer"}
              </Button>
            </div>
          </div>
        )}

        {/* Offers list */}
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading vendors...
          </p>
        ) : offers.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center">
            <p className="text-sm font-medium">No vendors added yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a vendor, their rate and quote to build this product&apos;s
              supplier list.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Vendor</th>
                  <th className="px-3 py-2 font-medium">Rate</th>
                  <th className="px-3 py-2 font-medium">MOQ</th>
                  <th className="px-3 py-2 font-medium">Lead time</th>
                  <th className="px-3 py-2 font-medium">Valid until</th>
                  <th className="px-3 py-2 font-medium">Quote</th>
                  <th className="px-3 py-2 font-medium">Remarks</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{o.vendor.name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {o.vendor.code}
                        {o.vendor.registrationStatus === "PENDING" && (
                          <Badge variant="outline" className="text-[10px]">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      {formatMoney(o.rate, o.currency)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {o.moq ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {o.leadTimeDays != null ? `${o.leadTimeDays} d` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {o.validUntil
                        ? new Date(o.validUntil).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {o.quoteFilePath ? (
                        <a
                          href={o.quoteFilePath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#F47B20] hover:underline"
                        >
                          <FileText className="size-3.5" />
                          View
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 text-muted-foreground">
                      {o.remarks || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(o.id, o.vendor.name)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
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
