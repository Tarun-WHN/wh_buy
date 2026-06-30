"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { RefreshCw, Plus, Pencil, Trash2, Info } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  getVendorPerformance,
  getPerformanceVendors,
  syncVendorPerformance,
  createManualEntry,
  updateEntryManualFields,
  deletePerformanceEntry,
} from "@/actions/vendor-performance.actions";

// ============================================================
// HELPERS
// ============================================================

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function fmtDate(v: string | Date | null) {
  if (!v) return "—";
  const dt = new Date(v);
  const yy = String(dt.getFullYear()).slice(-2);
  return `${String(dt.getDate()).padStart(2, "0")}-${MONTHS[dt.getMonth()]}-${yy}`;
}

function fmtRate(v: number | null) {
  if (v == null) return "—";
  return `₹${v.toLocaleString("en-IN")}`;
}

function scoreColor(s: number | null) {
  if (s == null) return "text-muted-foreground";
  if (s >= 80) return "text-emerald-600";
  if (s >= 60) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(s: number | null) {
  if (s == null) return "bg-muted";
  if (s >= 80) return "bg-emerald-500";
  if (s >= 60) return "bg-amber-500";
  return "bg-red-500";
}

interface Entry {
  id: string;
  source: string;
  vendorName: string;
  rfqCode: string | null;
  rfqDate: string | null;
  submissionDeadline: string | null;
  quoteSubmissionDate: string | null;
  quotedRate: number | null;
  productLabel: string | null;
  pricingLevel: number | null;
  scheduledDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  modelMake: string | null;
  firstEscalationDate: string | null;
  manualEscalationCount: number;
  escalationCount: number;
  remarks: string | null;
}

interface Rating {
  vendorId: string;
  vendorName: string;
  entries: number;
  quotation: number | null;
  delivery: number | null;
  pricing: number | null;
  quality: number | null;
  overall: number | null;
}

interface VendorOpt {
  id: string;
  name: string;
  code: string;
}

const EMPTY_MANUAL = {
  vendorId: "",
  rfqCode: "",
  rfqDate: "",
  submissionDeadline: "",
  quoteSubmissionDate: "",
  quotedRate: "",
  productLabel: "",
  pricingLevel: "",
  scheduledDeliveryDate: "",
  actualDeliveryDate: "",
  modelMake: "",
  firstEscalationDate: "",
  manualEscalationCount: "",
  remarks: "",
};

// ============================================================
// PAGE
// ============================================================

export default function VendorPerformancePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [weights, setWeights] = useState({
    delivery: 0.35,
    quality: 0.3,
    pricing: 0.2,
    quotation: 0.15,
  });
  const [vendors, setVendors] = useState<VendorOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_MANUAL });
  const [saving, setSaving] = useState(false);

  const [editRow, setEditRow] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState({
    modelMake: "",
    firstEscalationDate: "",
    manualEscalationCount: "",
    remarks: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [perf, v] = await Promise.all([
        getVendorPerformance(),
        getPerformanceVendors(),
      ]);
      setEntries(perf.entries as unknown as Entry[]);
      setRatings(perf.ratings as unknown as Rating[]);
      setWeights(perf.weights);
      setVendors(v as VendorOpt[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await syncVendorPerformance();
      toast.success(`Synced ${res.synced} record(s) from quotations`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleAdd() {
    if (!addForm.vendorId) {
      toast.error("Select a vendor");
      return;
    }
    setSaving(true);
    try {
      await createManualEntry({
        vendorId: addForm.vendorId,
        rfqCode: addForm.rfqCode || undefined,
        rfqDate: addForm.rfqDate || undefined,
        submissionDeadline: addForm.submissionDeadline || undefined,
        quoteSubmissionDate: addForm.quoteSubmissionDate || undefined,
        quotedRate: addForm.quotedRate ? Number(addForm.quotedRate) : undefined,
        productLabel: addForm.productLabel || undefined,
        pricingLevel: addForm.pricingLevel
          ? Number(addForm.pricingLevel)
          : undefined,
        scheduledDeliveryDate: addForm.scheduledDeliveryDate || undefined,
        actualDeliveryDate: addForm.actualDeliveryDate || undefined,
        modelMake: addForm.modelMake || undefined,
        firstEscalationDate: addForm.firstEscalationDate || undefined,
        manualEscalationCount: addForm.manualEscalationCount
          ? Number(addForm.manualEscalationCount)
          : undefined,
        remarks: addForm.remarks || undefined,
      });
      toast.success("Performance row added");
      setAddOpen(false);
      setAddForm({ ...EMPTY_MANUAL });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(e: Entry) {
    setEditRow(e);
    setEditForm({
      modelMake: e.modelMake ?? "",
      firstEscalationDate: e.firstEscalationDate
        ? new Date(e.firstEscalationDate).toISOString().slice(0, 10)
        : "",
      manualEscalationCount: String(e.manualEscalationCount ?? ""),
      remarks: e.remarks ?? "",
    });
  }

  async function handleEditSave() {
    if (!editRow) return;
    setSaving(true);
    try {
      await updateEntryManualFields(editRow.id, {
        modelMake: editForm.modelMake || undefined,
        firstEscalationDate: editForm.firstEscalationDate || undefined,
        manualEscalationCount: editForm.manualEscalationCount
          ? Number(editForm.manualEscalationCount)
          : undefined,
        remarks: editForm.remarks || undefined,
      });
      toast.success("Updated");
      setEditRow(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this performance row?")) return;
    try {
      await deletePerformanceEntry(id);
      toast.success("Deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Vendor Performance"
        description="Track each vendor's quotation, pricing, delivery and quality — and an overall performance rating."
      >
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw
            className={`mr-1.5 size-4 ${syncing ? "animate-spin" : ""}`}
          />
          {syncing ? "Syncing..." : "Sync from records"}
        </Button>
        <Button variant="brand" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Add Row
        </Button>
      </PageHeader>

      {/* Ratings summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendor Ratings</CardTitle>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="size-3.5" />
            Weighted: Delivery {Math.round(weights.delivery * 100)}% · Quality{" "}
            {Math.round(weights.quality * 100)}% · Pricing{" "}
            {Math.round(weights.pricing * 100)}% · Quotation{" "}
            {Math.round(weights.quotation * 100)}%
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          ) : ratings.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center">
              <p className="text-sm font-medium">No performance data yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Click <strong>Sync from records</strong> to pull from existing
                quotations &amp; deliveries, or <strong>Add Row</strong> to log
                one manually.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ratings.map((r) => (
                <div key={r.vendorId} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{r.vendorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.entries} record{r.entries === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-2xl font-bold ${scoreColor(
                          r.overall
                        )}`}
                      >
                        {r.overall != null ? Math.round(r.overall) : "—"}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Rating
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {(
                      [
                        ["Delivery", r.delivery],
                        ["Quality", r.quality],
                        ["Pricing", r.pricing],
                        ["Quotation", r.quotation],
                      ] as const
                    ).map(([label, val]) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="w-16 text-xs text-muted-foreground">
                          {label}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full ${scoreBg(val)}`}
                            style={{ width: `${val ?? 0}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-xs font-medium">
                          {val != null ? Math.round(val) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Log</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          ) : entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No rows yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Vendor</th>
                    <th className="px-2 py-2 font-medium">RFQ Code</th>
                    <th className="px-2 py-2 font-medium">RFQ Date</th>
                    <th className="px-2 py-2 font-medium">Quote Subm.</th>
                    <th className="px-2 py-2 font-medium">Quoted Rate</th>
                    <th className="px-2 py-2 font-medium">Level</th>
                    <th className="px-2 py-2 font-medium">Product</th>
                    <th className="px-2 py-2 font-medium">Model/Make</th>
                    <th className="px-2 py-2 font-medium">Sched. Delivery</th>
                    <th className="px-2 py-2 font-medium">Actual Delivery</th>
                    <th className="px-2 py-2 font-medium">1st Escalation</th>
                    <th className="px-2 py-2 font-medium">Escalations</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1.5 font-medium">
                          {e.vendorName}
                          <Badge
                            variant="outline"
                            className="text-[9px] uppercase"
                          >
                            {e.source}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {e.rfqCode || "—"}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {fmtDate(e.rfqDate)}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {fmtDate(e.quoteSubmissionDate)}
                      </td>
                      <td className="px-2 py-2.5 font-medium">
                        {fmtRate(e.quotedRate)}
                      </td>
                      <td className="px-2 py-2.5">
                        {e.pricingLevel ? (
                          <Badge variant="secondary">L{e.pricingLevel}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[160px] truncate px-2 py-2.5 text-muted-foreground">
                        {e.productLabel || "—"}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {e.modelMake || "—"}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {fmtDate(e.scheduledDeliveryDate)}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {fmtDate(e.actualDeliveryDate)}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {fmtDate(e.firstEscalationDate)}
                      </td>
                      <td className="px-2 py-2.5">
                        {e.escalationCount > 0 ? (
                          <span className="font-medium text-red-600">
                            {e.escalationCount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(e)}
                            title="Edit make/model & escalations"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(e.id)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add manual row dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add performance row</DialogTitle>
            <DialogDescription>
              Log a vendor&apos;s quote &amp; delivery manually. Leave fields
              blank if not applicable.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label>
                Vendor <span className="text-destructive">*</span>
              </Label>
              <Select
                value={addForm.vendorId}
                onValueChange={(v) =>
                  setAddForm((f) => ({ ...f, vendorId: v ?? "" }))
                }
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
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(
              [
                ["rfqCode", "RFQ Code", "text"],
                ["productLabel", "Product", "text"],
                ["rfqDate", "RFQ Date", "date"],
                ["submissionDeadline", "Quote Deadline", "date"],
                ["quoteSubmissionDate", "Quote Submission Date", "date"],
                ["quotedRate", "Quoted Rate (₹)", "number"],
                ["pricingLevel", "Pricing Level (1=L1)", "number"],
                ["modelMake", "Model / Make", "text"],
                ["scheduledDeliveryDate", "Scheduled Delivery", "date"],
                ["actualDeliveryDate", "Actual Delivery", "date"],
                ["firstEscalationDate", "1st Escalation Date", "date"],
                ["manualEscalationCount", "No. of Escalations", "number"],
              ] as const
            ).map(([key, label, type]) => (
              <div key={key} className="grid gap-2">
                <Label>{label}</Label>
                <Input
                  type={type}
                  value={(addForm as Record<string, string>)[key]}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}

            <div className="grid gap-2 sm:col-span-2">
              <Label>Remarks</Label>
              <Textarea
                rows={2}
                value={addForm.remarks}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, remarks: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? "Saving..." : "Add Row"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit manual fields dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit row</DialogTitle>
            <DialogDescription>
              {editRow?.vendorName} · {editRow?.rfqCode || "—"}. Overdue
              deliveries are counted as escalations automatically; add any extra
              below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Model / Make</Label>
              <Input
                value={editForm.modelMake}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, modelMake: e.target.value }))
                }
                placeholder="e.g. Brand A, Local Fabrication"
              />
            </div>
            <div className="grid gap-2">
              <Label>1st Escalation Date</Label>
              <Input
                type="date"
                value={editForm.firstEscalationDate}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    firstEscalationDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Additional escalations (manual)</Label>
              <Input
                type="number"
                min="0"
                value={editForm.manualEscalationCount}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    manualEscalationCount: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Remarks</Label>
              <Textarea
                rows={2}
                value={editForm.remarks}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, remarks: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
