"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Tag } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from "@/actions/brand.actions";

interface Brand {
  id: string;
  name: string;
  isActive: boolean;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBrands((await getBrands()) as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setName("");
    setOpen(true);
  }
  function openEdit(b: Brand) {
    setEditing(b);
    setName(b.name);
    setOpen(true);
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) await updateBrand(editing.id, { name });
      else await createBrand({ name });
      toast.success(editing ? "Brand updated" : "Brand added");
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(b: Brand) {
    if (!confirm(`Remove brand "${b.name}"?`)) return;
    try {
      await deleteBrand(b.id);
      toast.success("Removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Brands" description="Manage the brand list used across products">
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href="/masters" />}>
            <ArrowLeft className="mr-1.5 size-4" />
            Back
          </Button>
          <Button variant="brand" onClick={openAdd}>
            <Plus className="mr-1.5 size-4" />
            Add Brand
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All brands</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : brands.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <Tag className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium">No brands yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {brands.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <Tag className="size-4 text-muted-foreground" />
                    <span className="font-medium">{b.name}</span>
                    {!b.isActive && (
                      <Badge variant="outline" className="text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(b)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => remove(b)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit brand" : "Add brand"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Brand name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Godrej, Local / Non-branded"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="brand" onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save" : "Add Brand"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
