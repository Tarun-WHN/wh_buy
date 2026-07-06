"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Flag } from "lucide-react";
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
  getQualityClaims,
  getQualityStats,
  getClaimVendors,
  createQualityClaim,
  updateClaimStatus,
  deleteQualityClaim,
} from "@/actions/quality.actions";

const TYPES = ["REJECTION", "QUALITY", "REPLACEMENT", "WARRANTY", "DAMAGE"] as const;
const SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

const typeLabel: Record<string, string> = {
  REJECTION: "Rejection",
  QUALITY: "Quality complaint",
  REPLACEMENT: "Replacement",
  WARRANTY: "Warranty",
  DAMAGE: "Damage",
};
const sevStyle: Record<string, string> = {
  HIGH: "text-red-700",
  MEDIUM: "text-amber-700",
  LOW: "text-muted-foreground",
};
const statusStyle: Record<string, string> = {
  OPEN: "text-red-700",
  IN_PROGRESS: "text-amber-700",
  RESOLVED: "text-emerald-700",
  CLOSED: "text-muted-foreground",
};

interface Claim {
  id: string;
  number: string;
  vendorName: string;
  vendorCode: string;
  productName: string | null;
  poNumber: string | null;
  type: string;
  severity: string;
  status: string;
  quantity: number | null;
  description: string;
  raisedDate: string;
  resolvedDate: string | null;
  resolutionDays: number;
}

export default function QualityPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    avgResolutionDays: number | null;
  } | null>(null);
  const [vendors, setVendors] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vendorId: "",
    type: "QUALITY" as string,
    severity: "MEDIUM" as string,
    productName: "",
    poNumber: "",
    quantity: "",
    description: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, st, v] = await Promise.all([
        getQualityClaims(),
        getQualityStats(),
        getClaimVendors(),
      ]);
      setClaims(c as never);
      setStats(st as never);
      setVendors(v as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!form.vendorId || !form.description) {
      toast.error("Vendor and description are required");
      return;
    }
    setSaving(true);
    try {
      await createQualityClaim({
        vendorId: form.vendorId,
        type: form.type as never,
        severity: form.severity as never,
        productName: form.productName || undefined,
        poNumber: form.poNumber || undefined,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        description: form.description,
      });
      toast.success("Claim logged");
      setOpen(false);
      setForm({
        vendorId: "",
        type: "QUALITY",
        severity: "MEDIUM",
        productName: "",
        poNumber: "",
        quantity: "",
        description: "",
      });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: string) {
    try {
      await updateClaimStatus(id, status);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this claim?")) return;
    try {
      await deleteQualityClaim(id);
      toast.success("Deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality & Claims"
        description="Log and track rejections, quality complaints, replacements and warranty claims — repeated issues lower vendor risk scores."
      >
        <Button variant="brand" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Log Claim
        </Button>
      </PageHeader>

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Open" value={stats?.open ?? 0} cls="text-red-700" />
        <StatCard label="In progress" value={stats?.inProgress ?? 0} cls="text-amber-700" />
        <StatCard label="Resolved" value={stats?.resolved ?? 0} cls="text-emerald-700" />
        <StatCard
          label="Avg resolution"
          value={stats?.avgResolutionDays != null ? `${stats.avgResolutionDays}d` : "—"}
          cls="text-foreground"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Claims</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : claims.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <Flag className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium">No claims logged</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Log the first quality issue with “Log Claim”.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Claim</th>
                    <th className="px-3 py-2 font-medium">Vendor</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Severity</th>
                    <th className="px-3 py-2 font-medium">Raised</th>
                    <th className="px-3 py-2 font-medium">Age/Res.</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{c.number}</div>
                        <div className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {c.productName || c.description}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {c.vendorName}
                        <div className="text-xs text-muted-foreground">{c.vendorCode}</div>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {typeLabel[c.type] ?? c.type}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`font-medium ${sevStyle[c.severity]}`}>
                          {c.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{fmt(c.raisedDate)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{c.resolutionDays}d</td>
                      <td className="px-3 py-2.5">
                        <select
                          value={c.status}
                          onChange={(e) => changeStatus(c.id, e.target.value)}
                          className={`h-7 rounded-md border border-input bg-transparent px-1.5 text-xs font-medium outline-none ${statusStyle[c.status]}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button variant="ghost" size="icon-sm" onClick={() => remove(c.id)}>
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

      {/* Log dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log quality claim</DialogTitle>
            <DialogDescription>
              Record an issue against a vendor. This feeds their risk score and rating.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label>
                Vendor <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.vendorId}
                onValueChange={(v) => setForm((f) => ({ ...f, vendorId: v ?? "" }))}
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
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v ?? "QUALITY" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{() => typeLabel[form.type]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {typeLabel[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Severity</Label>
              <Select
                value={form.severity}
                onValueChange={(v) => setForm((f) => ({ ...f, severity: v ?? "MEDIUM" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{() => form.severity}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((sv) => (
                    <SelectItem key={sv} value={sv}>
                      {sv}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Product</Label>
              <Input
                value={form.productName}
                onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2">
              <Label>PO number</Label>
              <Input
                value={form.poNumber}
                onChange={(e) => setForm((f) => ({ ...f, poNumber: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Quantity affected</Label>
              <Input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What went wrong?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" onClick={handleCreate} disabled={saving}>
              {saving ? "Saving…" : "Log Claim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, cls }: { label: string; value: string | number; cls: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className={`text-2xl font-bold ${cls}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
