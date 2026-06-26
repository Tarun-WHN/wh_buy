"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
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
import { UOM_OPTIONS } from "@/lib/constants";
import { createProduct, getCategories } from "@/actions/product.actions";

// ============================================================
// TYPES
// ============================================================

interface CategoryData {
  id: string;
  name: string;
  subcategories: {
    id: string;
    name: string;
    productGroups: {
      id: string;
      name: string;
    }[];
  }[];
}

// ============================================================
// PAGE
// ============================================================

export default function NewProductPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<CategoryData[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [productGroupId, setProductGroupId] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [uom, setUom] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [gstPercent, setGstPercent] = useState("0");
  const [specifications, setSpecifications] = useState("");

  useEffect(() => {
    startTransition(async () => {
      try {
        const cats = await getCategories();
        setCategories(cats as CategoryData[]);
      } catch {
        // silent
      }
    });
  }, []);

  // Cascading selections
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const subcategories = selectedCategory?.subcategories ?? [];
  const selectedSubcategory = subcategories.find(
    (s) => s.id === subcategoryId
  );
  const productGroups = selectedSubcategory?.productGroups ?? [];

  function handleCategoryChange(val: string | null) {
    setCategoryId(val ?? "");
    setSubcategoryId("");
    setProductGroupId("");
  }

  function handleSubcategoryChange(val: string | null) {
    setSubcategoryId(val ?? "");
    setProductGroupId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !sku || !uom || !productGroupId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createProduct({
        name,
        sku,
        description: description || undefined,
        uom,
        hsnCode: hsnCode || undefined,
        gstPercent: parseFloat(gstPercent) || 0,
        specifications: specifications || undefined,
        productGroupId,
      });
      toast.success("Product created successfully");
      router.push("/masters/products");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create product"
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Product"
        description="Create a new product in the catalog"
      >
        <Button variant="outline" render={<Link href="/masters/products" />}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Products
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product name"
                required
              />
            </div>

            {/* SKU */}
            <div className="grid gap-2">
              <Label htmlFor="sku">
                SKU <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU code"
                required
              />
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Select value={categoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory */}
            <div className="grid gap-2">
              <Label>
                Subcategory <span className="text-destructive">*</span>
              </Label>
              <Select
                value={subcategoryId}
                onValueChange={handleSubcategoryChange}
                disabled={!categoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Group */}
            <div className="grid gap-2">
              <Label>
                Product Group <span className="text-destructive">*</span>
              </Label>
              <Select
                value={productGroupId}
                onValueChange={(val) => setProductGroupId(val ?? "")}
                disabled={!subcategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product group" />
                </SelectTrigger>
                <SelectContent>
                  {productGroups.map((pg) => (
                    <SelectItem key={pg.id} value={pg.id}>
                      {pg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* UOM */}
            <div className="grid gap-2">
              <Label>
                UOM <span className="text-destructive">*</span>
              </Label>
              <Select value={uom} onValueChange={(val) => setUom(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select UOM" />
                </SelectTrigger>
                <SelectContent>
                  {UOM_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* HSN Code */}
            <div className="grid gap-2">
              <Label htmlFor="hsnCode">HSN Code</Label>
              <Input
                id="hsnCode"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="HSN code"
              />
            </div>

            {/* GST % */}
            <div className="grid gap-2">
              <Label htmlFor="gstPercent">GST %</Label>
              <Input
                id="gstPercent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={gstPercent}
                onChange={(e) => setGstPercent(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Specifications */}
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="specifications">Specifications</Label>
              <Textarea
                id="specifications"
                value={specifications}
                onChange={(e) => setSpecifications(e.target.value)}
                placeholder="Product specifications"
                rows={3}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" render={<Link href="/masters/products" />}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
