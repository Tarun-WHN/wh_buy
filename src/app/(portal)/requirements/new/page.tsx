"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY } from "@/lib/constants";
import {
  createRequirement,
  submitRequirement,
  getWarehouses,
  getProductsForSelection,
} from "@/actions/requirement.actions";

// ============================================================
// TYPES
// ============================================================

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

interface LineItem {
  key: string;
  productId: string;
  productName: string;
  quantity: string;
  specifications: string;
  remarks: string;
}

// ============================================================
// PAGE
// ============================================================

export default function NewRequirementPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [requiredDate, setRequiredDate] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    {
      key: crypto.randomUUID(),
      productId: "",
      productName: "",
      quantity: "1",
      specifications: "",
      remarks: "",
    },
  ]);

  useEffect(() => {
    startTransition(async () => {
      try {
        const wh = await getWarehouses();
        setWarehouses(wh as WarehouseOption[]);
      } catch {
        // silent
      }
    });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      startTransition(async () => {
        try {
          const prods = await getProductsForSelection(productSearch || undefined);
          setProducts(prods as ProductOption[]);
        } catch {
          // silent
        }
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [productSearch]);

  function addLineItem() {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: "",
        productName: "",
        quantity: "1",
        specifications: "",
        remarks: "",
      },
    ]);
  }

  function removeLineItem(key: string) {
    if (items.length <= 1) {
      toast.error("At least one item is required");
      return;
    }
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateLineItem(key: string, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [field]: value } : i))
    );
  }

  function selectProduct(key: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    setItems((prev) =>
      prev.map((i) =>
        i.key === key
          ? {
              ...i,
              productId,
              productName: product ? `${product.name} (${product.sku})` : "",
            }
          : i
      )
    );
  }

  async function handleSubmit(e: React.FormEvent, asDraft: boolean) {
    e.preventDefault();

    if (!title || !warehouseId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const validItems = items.filter((i) => i.productId);
    if (validItems.length === 0) {
      toast.error("At least one item with a product is required");
      return;
    }

    try {
      const requirement = await createRequirement({
        title,
        description: description || undefined,
        warehouseId,
        priority,
        requiredDate: requiredDate || undefined,
        items: validItems.map((i) => ({
          productId: i.productId,
          quantity: parseFloat(i.quantity) || 1,
          specifications: i.specifications || undefined,
          remarks: i.remarks || undefined,
        })),
      });

      if (!asDraft) {
        await submitRequirement(requirement.id);
        toast.success("Requirement submitted successfully");
      } else {
        toast.success("Requirement saved as draft");
      }

      router.push("/requirements");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create requirement"
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Requirement"
        description="Create a new procurement requirement"
      >
        <Button variant="outline" render={<Link href="/requirements" />}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={(e) => handleSubmit(e, true)}>
        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requirement Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Requirement title"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Select value={warehouseId} onValueChange={(val) => setWarehouseId(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse">
                    {(value) => {
                      const wh = warehouses.find((w) => w.id === value);
                      return wh ? `${wh.name} (${wh.code})` : "Select warehouse";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(val) => setPriority(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PRIORITY).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="requiredDate">Required Date</Label>
              <Input
                id="requiredDate"
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Requirement description"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="mr-1.5 size-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.key}
                  className="rounded-lg border p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Item {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeLineItem(item.key)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>
                        Product <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={item.productId}
                        onValueChange={(val) => selectProduct(item.key, val ?? "")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product">
                            {() => item.productName || "Select product"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2">
                            <Input
                              placeholder="Search products..."
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              className="mb-2"
                            />
                          </div>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.sku}) - {p.uom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>
                        Quantity <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.key, "quantity", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Specifications</Label>
                      <Input
                        value={item.specifications}
                        onChange={(e) =>
                          updateLineItem(
                            item.key,
                            "specifications",
                            e.target.value
                          )
                        }
                        placeholder="Specifications"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Remarks</Label>
                      <Input
                        value={item.remarks}
                        onChange={(e) =>
                          updateLineItem(item.key, "remarks", e.target.value)
                        }
                        placeholder="Remarks"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" render={<Link href="/requirements" />}>
            Cancel
          </Button>
          <Button type="submit" variant="outline" disabled={isPending}>
            {isPending ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={(e) => handleSubmit(e, false)}
          >
            {isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
