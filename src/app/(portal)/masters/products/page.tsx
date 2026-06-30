"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, SortableHeader, type ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProducts, getCategories } from "@/actions/product.actions";

// ============================================================
// TYPES
// ============================================================

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  uom: string;
  gstPercent: number;
  isActive: boolean;
  categoryName: string;
  subcategoryName: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

// ============================================================
// COLUMNS
// ============================================================

const columns: ColumnDef<ProductRow, unknown>[] = [
  {
    accessorKey: "sku",
    header: SortableHeader("SKU"),
    cell: ({ row }) => (
      <Link
        href={`/masters/products/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.sku}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: SortableHeader("Name"),
  },
  {
    accessorKey: "categoryName",
    header: "Category",
  },
  {
    accessorKey: "subcategoryName",
    header: "Subcategory",
  },
  {
    accessorKey: "uom",
    header: "UOM",
  },
  {
    accessorKey: "gstPercent",
    header: "GST %",
    cell: ({ row }) => `${row.original.gstPercent}%`,
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.isActive ? "APPROVED" : "REJECTED"} />
    ),
    filterFn: (row, _id, value) => {
      if (!value) return true;
      return row.original.isActive ? value === "active" : value === "inactive";
    },
  },
];

// ============================================================
// PAGE
// ============================================================

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter]);

  function loadCategories() {
    startTransition(async () => {
      try {
        const cats = await getCategories();
        setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
      } catch {
        // silent
      }
    });
  }

  function loadProducts() {
    startTransition(async () => {
      try {
        const result = await getProducts({
          search: search || undefined,
          categoryId: categoryFilter || undefined,
        });
        const rows: ProductRow[] = result.data.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          uom: p.uom,
          gstPercent: p.gstPercent,
          isActive: p.isActive,
          categoryName: p.productGroup.subcategory.category.name,
          subcategoryName: p.productGroup.subcategory.name,
        }));
        setProducts(rows);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load products"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Master"
        description="Manage your product catalog"
      >
        <Button variant="brand" render={<Link href="/masters/products/new" />}>
          <Plus className="mr-1.5 size-4" />
          Add Product
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select
              value={categoryFilter}
              onValueChange={(val) => setCategoryFilter(!val || val === "__all__" ? "" : val)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={products}
            searchKey="name"
            searchPlaceholder="Filter by name..."
            onRowClick={(row) => router.push(`/masters/products/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
