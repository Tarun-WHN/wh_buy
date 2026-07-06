"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, FolderKanban, GitCompare } from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getProjects,
  createProject,
  getProjectHistory,
  compareProjects,
} from "@/actions/project.actions";

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

interface ProjectRow {
  id: string;
  name: string;
  code: string;
  status: string;
  poCount: number;
  spend: number;
}
interface History {
  id: string;
  name: string;
  code: string;
  spend: number;
  poCount: number;
  vendors: { name: string; spend: number }[];
  products: { name: string; qty: number; spend: number }[];
  timeline: { number: string; vendor: string; amount: number; date: string }[];
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareId, setCompareId] = useState("");
  const [cmp, setCmp] = useState<{ a: History | null; b: History | null } | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProjects((await getProjects()) as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pick(id: string) {
    setSelected(id);
    setCompareMode(false);
    setCmp(null);
    setHistory((await getProjectHistory(id)) as never);
  }

  async function runCompare(bId: string) {
    setCompareId(bId);
    if (selected && bId) setCmp((await compareProjects(selected, bId)) as never);
  }

  async function handleCreate() {
    if (!form.name || !form.code) {
      toast.error("Name and code are required");
      return;
    }
    setSaving(true);
    try {
      await createProject({
        name: form.name,
        code: form.code,
        description: form.description || undefined,
      });
      toast.success("Project created");
      setOpen(false);
      setForm({ name: "", code: "", description: "" });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Track procurement per project — spend, vendors, products and a full purchase timeline. Compare projects side by side."
      >
        <Button variant="brand" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          New Project
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects yet. Create one, then tag POs to it from the PO page.
              </p>
            ) : (
              projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted",
                    selected === p.id && "border-[#F47B20] bg-[#F47B20]/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {p.status}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {p.code} · {p.poCount} PO{p.poCount === 1 ? "" : "s"} · {money(p.spend)}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* detail */}
        <div className="space-y-4">
          {!history ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FolderKanban className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium">Select a project</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  See its spend, vendors, products and purchase timeline.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {history.name}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {history.code}
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant={compareMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setCompareMode((m) => !m);
                      setCmp(null);
                      setCompareId("");
                    }}
                  >
                    <GitCompare className="mr-1.5 size-4" />
                    Compare
                  </Button>
                </div>
              </div>

              {compareMode ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Compare with…</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <select
                      value={compareId}
                      onChange={(e) => runCompare(e.target.value)}
                      className="h-9 w-full max-w-sm rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                    >
                      <option value="">Select another project…</option>
                      {projects
                        .filter((p) => p.id !== selected)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                    </select>
                    {cmp?.a && cmp?.b && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                              <th className="px-3 py-2 font-medium">Metric</th>
                              <th className="px-3 py-2 font-medium">{cmp.a.code}</th>
                              <th className="px-3 py-2 font-medium">{cmp.b.code}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              ["Total spend", money(cmp.a.spend), money(cmp.b.spend)],
                              ["Purchase orders", cmp.a.poCount, cmp.b.poCount],
                              ["Vendors", cmp.a.vendors.length, cmp.b.vendors.length],
                              ["Distinct products", cmp.a.products.length, cmp.b.products.length],
                              ["Top vendor", cmp.a.vendors[0]?.name ?? "—", cmp.b.vendors[0]?.name ?? "—"],
                            ].map((r) => (
                              <tr key={r[0] as string} className="border-b last:border-0">
                                <td className="px-3 py-2 text-muted-foreground">{r[0]}</td>
                                <td className="px-3 py-2 font-medium">{r[1]}</td>
                                <td className="px-3 py-2 font-medium">{r[2]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Metric label="Spend" value={money(history.spend)} />
                    <Metric label="POs" value={history.poCount} />
                    <Metric label="Vendors" value={history.vendors.length} />
                    <Metric label="Products" value={history.products.length} />
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <ListCard
                      title="Vendors"
                      rows={history.vendors.map((v) => ({ label: v.name, value: money(v.spend) }))}
                    />
                    <ListCard
                      title="Products"
                      rows={history.products.map((p) => ({
                        label: p.name,
                        value: `${p.qty} · ${money(p.spend)}`,
                      }))}
                    />
                  </div>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Purchase timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {history.timeline.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No POs tagged to this project yet.
                        </p>
                      ) : (
                        <ul className="divide-y">
                          {history.timeline.map((t) => (
                            <li key={t.number} className="flex justify-between py-2 text-sm">
                              <span>
                                <span className="font-medium">{t.number}</span> ·{" "}
                                <span className="text-muted-foreground">{t.vendor}</span>
                              </span>
                              <span className="text-muted-foreground">
                                {money(t.amount)} ·{" "}
                                {new Date(t.date).toLocaleDateString("en-IN")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Jaipur Warehouse Fit-out"
              />
            </div>
            <div className="grid gap-2">
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. JAI-WH-01"
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" onClick={handleCreate} disabled={saving}>
              {saving ? "Saving…" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function ListCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="divide-y">
            {rows.slice(0, 8).map((r) => (
              <li key={r.label} className="flex justify-between gap-3 py-2 text-sm">
                <span className="truncate">{r.label}</span>
                <span className="shrink-0 font-medium">{r.value}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
