"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createRfq,
  publishRfq,
  getApprovedVendors,
  getApprovedRequirements,
} from "@/actions/rfq.actions";
import { getProductsForSelection } from "@/actions/requirement.actions";

// ============================================================
// TYPES
// ============================================================

interface VendorOption {
  id: string;
  name: string;
  code: string;
  email: string;
  rating: number;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

interface RequirementOption {
  id: string;
  number: string;
  title: string;
  items: {
    id: string;
    quantity: number;
    specifications: string | null;
    product: { id: string; name: string; sku: string; uom: string };
  }[];
  warehouse: { id: string; name: string; code: string };
}

interface LineItem {
  key: string;
  productId: string;
  productName: string;
  quantity: string;
  targetPrice: string;
  specifications: string;
}

// ============================================================
// PAGE
// ============================================================

export default function NewRfqPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requirementIdParam = searchParams.get("requirementId");

  const [isPending, startTransition] = useTransition();
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [requirements, setRequirements] = useState<RequirementOption[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [rfqType, setRfqType] = useState("SINGLE");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [termsConditions, setTermsConditions] = useState("");
  const [requirementId, setRequirementId] = useState(requirementIdParam || "");
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [items, setItems] = useState<LineItem[]>([
    {
      key: crypto.randomUUID(),
      productId: "",
      productName: "",
      quantity: "1",
      targetPrice: "",
      specifications: "",
    },
  ]);

  // Load vendors, products, and requirements on mount
  useEffect(() => {
    startTransition(async () => {
      try {
        const [vendorList, reqList] = await Promise.all([
          getApprovedVendors(),
          getApprovedRequirements(),
        ]);
        setVendors(vendorList as VendorOption[]);
        setRequirements(reqList as unknown as RequirementOption[]);

        // Auto-fill from requirement if param provided
        if (requirementIdParam) {
          const req = (reqList as unknown as RequirementOption[]).find(
            (r) => r.id === requirementIdParam
          );
          if (req) {
            prefillFromRequirement(req);
          }
        }
      } catch {
        // silent
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search products with debounce
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

  function prefillFromRequirement(req: RequirementOption) {
    setTitle(`RFQ for ${req.title}`);
    setDeliveryLocation(
      `${req.warehouse.name} (${req.warehouse.code})`
    );
    setItems(
      req.items.map((item) => ({
        key: crypto.randomUUID(),
        productId: item.product.id,
        productName: `${item.product.name} (${item.product.sku})`,
        quantity: String(item.quantity),
        targetPrice: "",
        specifications: item.specifications || "",
      }))
    );
  }

  function handleRequirementChange(reqId: string) {
    setRequirementId(reqId);
    if (reqId) {
      const req = requirements.find((r) => r.id === reqId);
      if (req) {
        prefillFromRequirement(req);
      }
    }
  }

  // Line items management
  function addLineItem() {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: "",
        productName: "",
        quantity: "1",
        targetPrice: "",
        specifications: "",
      },
    ]);
  }

  function removeLineItem(key: string) {
    if (items.length <= 1) {
      toast.error("At least one line item is required");
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

  // Vendor selection
  function toggleVendor(vendorId: string) {
    setSelectedVendorIds((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId]
    );
  }

  // Submit
  async function handleSubmit(e: React.FormEvent, publish: boolean) {
    e.preventDefault();

    if (!title) {
      toast.error("Please provide a title");
      return;
    }

    const validItems = items.filter((i) => i.productId);
    if (validItems.length === 0) {
      toast.error("At least one line item with a product is required");
      return;
    }

    if (selectedVendorIds.length === 0) {
      toast.error("Please select at least one vendor");
      return;
    }

    try {
      const rfq = await createRfq({
        title,
        rfqType,
        deliveryLocation: deliveryLocation || undefined,
        submissionDeadline: submissionDeadline || undefined,
        termsConditions: termsConditions || undefined,
        requirementId: requirementId || undefined,
        lineItems: validItems.map((i) => ({
          productId: i.productId,
          quantity: parseFloat(i.quantity) || 1,
          targetPrice: i.targetPrice ? parseFloat(i.targetPrice) : undefined,
          specifications: i.specifications || undefined,
        })),
        vendorIds: selectedVendorIds,
      });

      if (publish) {
        await publishRfq(rfq.id);
        toast.success("RFQ created and published");
      } else {
        toast.success("RFQ saved as draft");
      }

      router.push("/rfq");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create RFQ"
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New RFQ"
        description="Create a new request for quotation"
      >
        <Button variant="outline" render={<Link href="/rfq" />}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </PageHeader>

      <form onSubmit={(e) => handleSubmit(e, false)}>
        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">RFQ Details</CardTitle>
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
                placeholder="RFQ title"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={rfqType} onValueChange={(val) => setRfqType(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE">Single</SelectItem>
                  <SelectItem value="MULTI">Multi</SelectItem>
                  <SelectItem value="BULK">Bulk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="submissionDeadline">Submission Deadline</Label>
              <Input
                id="submissionDeadline"
                type="datetime-local"
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="deliveryLocation">Delivery Location</Label>
              <Input
                id="deliveryLocation"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="Delivery location"
              />
            </div>

            <div className="grid gap-2">
              <Label>Link to Requirement</Label>
              <Select
                value={requirementId}
                onValueChange={(val) => handleRequirementChange(val ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select requirement (optional)">
                    {(value) => {
                      const req = requirements.find((r) => r.id === value);
                      return req
                        ? `${req.number} - ${req.title}`
                        : "Select requirement (optional)";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {requirements.map((req) => (
                    <SelectItem key={req.id} value={req.id}>
                      {req.number} - {req.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="termsConditions">Terms & Conditions</Label>
              <Textarea
                id="termsConditions"
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                placeholder="Terms and conditions"
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

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                      <Label>Target Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.targetPrice}
                        onChange={(e) =>
                          updateLineItem(item.key, "targetPrice", e.target.value)
                        }
                        placeholder="0.00"
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
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Vendor Selection */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">
              Select Vendors <span className="text-destructive">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vendors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No approved vendors found.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {vendors.map((vendor) => (
                  <label
                    key={vendor.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <Checkbox
                      checked={selectedVendorIds.includes(vendor.id)}
                      onCheckedChange={() => toggleVendor(vendor.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {vendor.code} &middot; {vendor.email}
                      </p>
                      {vendor.rating > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Rating: {vendor.rating.toFixed(1)}/5
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
            {selectedVendorIds.length > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                {selectedVendorIds.length} vendor(s) selected
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" render={<Link href="/rfq" />}>
            Cancel
          </Button>
          <Button type="submit" variant="outline" disabled={isPending}>
            {isPending ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={(e) => handleSubmit(e, true)}
          >
            {isPending ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </form>
    </div>
  );
}
