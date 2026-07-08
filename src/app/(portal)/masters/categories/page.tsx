"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateTaxonomyButton } from "@/components/masters/create-taxonomy-button";
import { ImportButton } from "@/components/masters/import-button";
import { getCategories, importCategories } from "@/actions/product.actions";

type Category = Awaited<ReturnType<typeof getCategories>>[number];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load categories"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage product categories, sub-categories and groups"
      >
        <Button variant="outline" render={<Link href="/masters" />}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Masters
        </Button>
        <ImportButton
          templateName="categories"
          headers={["Category", "Subcategory", "ProductGroup"]}
          sample={["Office Supplies", "Stationery", "Paper"]}
          action={importCategories}
          onDone={() => loadCategories()}
        />
        <CreateTaxonomyButton level="category" onCreated={loadCategories} />
      </PageHeader>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading categories...</p>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No categories yet — create your first one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {category.code}
                    </span>
                  </div>
                  <CreateTaxonomyButton
                    level="subcategory"
                    parentId={category.id}
                    onCreated={loadCategories}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {category.subcategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No sub-categories yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {category.subcategories.map((subcategory) => (
                      <div
                        key={subcategory.id}
                        className="rounded-lg border border-foreground/10 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {subcategory.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {subcategory.code}
                            </span>
                          </div>
                          <CreateTaxonomyButton
                            level="group"
                            parentId={subcategory.id}
                            onCreated={loadCategories}
                          />
                        </div>
                        {subcategory.productGroups.length === 0 ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            No product groups yet.
                          </p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {subcategory.productGroups.map((group) => (
                              <Badge key={group.id} variant="secondary">
                                {group.name}
                                <span className="text-muted-foreground/70">
                                  {group.code}
                                </span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
