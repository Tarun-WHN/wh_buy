"use client";

import * as React from "react";
import { useState, useEffect, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UOM_OPTIONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { getProduct, getCategories, updateProduct } from "@/actions/product.actions";

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

interface ProductData {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  uom: string;
  hsnCode: string | null;
  gstPercent: number;
  specifications: string | null;
  productGroupId: string;
  isActive: boolean;
  currentVersion: number;
  productGroup: {
    id: string;
    subcategory: {
      id: string;
      categoryId: string;
      category: { id: string };
    };
  };
  versions: {
    id: string;
    version: number;
    name: string;
    description: string | null;
    uom: string;
    specifications: string | null;
    changedBy: string;
    changeReason: string | null;
    createdAt: string;
  }[];
}

// ============================================================
// PAGE
// ============================================================

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [product, setProduct] = useState<ProductData | null>(null);
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
  const [changeReason, setChangeReason] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadData() {
    startTransition(async () => {
      try {
        const [productData, cats] = await Promise.all([
          getProduct(id),
          getCategories(),
        ]);
        const p = productData as unknown as ProductData;
        setProduct(p);
        setCategories(cats as CategoryData[]);

        // Populate form
        setName(p.name);
        setSku(p.sku);
        setDescription(p.description || "");
        setUom(p.uom);
        setHsnCode(p.hsnCode || "");
        setGstPercent(String(p.gstPercent));
        setSpecifications(p.specifications || "");
        setProductGroupId(p.productGroupId);

        // Resolve category/subcategory from the product group
        const catId = p.productGroup.subcategory.category.id;
        const subId = p.productGroup.subcategory.id;
        setCategoryId(catId);
        setSubcategoryId(subId);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load product"
        );
      }
    });
  }

  // Cascading
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !sku || !uom || !productGroupId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await updateProduct(id, {
        name,
        sku,
        description: description || undefined,
        uom,
        hsnCode: hsnCode || undefined,
        gstPercent: parseFloat(gstPercent) || 0,
        specifications: specifications || undefined,
        productGroupId,
        changeReason: changeReason || undefined,
      });
      toast.success("Product updated successfully");
      setChangeReason("");
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update product"
      );
    }
  }

  if (!product && isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading product...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Product not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku} | Version: ${product.currentVersion}`}
      >
        <Button variant="outline" render={<Link href="/masters/products" />}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Products
        </Button>
      </PageHeader>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* DETAILS TAB */}
        {/* ============================================================ */}
        <TabsContent value="details">
          <form onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Product Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sku">
                    SKU <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select
                    value={categoryId}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category">
                        {(value) => {
                          const cat = categories.find((c) => c.id === value);
                          return cat ? cat.name : "Select category";
                        }}
                      </SelectValue>
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

                <div className="grid gap-2">
                  <Label>Subcategory</Label>
                  <Select
                    value={subcategoryId}
                    onValueChange={handleSubcategoryChange}
                    disabled={!categoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory">
                        {(value) => {
                          const sub = subcategories.find((s) => s.id === value);
                          return sub ? sub.name : "Select subcategory";
                        }}
                      </SelectValue>
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

                <div className="grid gap-2">
                  <Label>Product Group</Label>
                  <Select
                    value={productGroupId}
                    onValueChange={(val) => setProductGroupId(val ?? "")}
                    disabled={!subcategoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product group">
                        {(value) => {
                          const pg = productGroups.find((p) => p.id === value);
                          return pg ? pg.name : "Select product group";
                        }}
                      </SelectValue>
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

                <div className="grid gap-2">
                  <Label>UOM</Label>
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

                <div className="grid gap-2">
                  <Label htmlFor="hsnCode">HSN Code</Label>
                  <Input
                    id="hsnCode"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                  />
                </div>

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
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="specifications">Specifications</Label>
                  <Textarea
                    id="specifications"
                    value={specifications}
                    onChange={(e) => setSpecifications(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="changeReason">Change Reason</Label>
                  <Input
                    id="changeReason"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="Reason for this update (optional)"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" render={<Link href="/masters/products" />}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ============================================================ */}
        {/* VERSION HISTORY TAB */}
        {/* ============================================================ */}
        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version History</CardTitle>
            </CardHeader>
            <CardContent>
              {product.versions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No version history available.
                </p>
              ) : (
                <div className="space-y-3">
                  {product.versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-start gap-4 rounded-lg border p-4"
                    >
                      <Badge variant="outline" className="shrink-0">
                        v{v.version}
                      </Badge>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground">
                          UOM: {v.uom}
                          {v.changeReason && ` | Reason: ${v.changeReason}`}
                        </p>
                        {v.description && (
                          <p className="text-xs text-muted-foreground">
                            {v.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(v.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
