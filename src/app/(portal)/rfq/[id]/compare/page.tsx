"use client";

import * as React from "react";
import { useState, useEffect, useTransition, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuoteComparisonMatrix } from "@/components/rfq/quote-comparison-matrix";
import { getRfq } from "@/actions/rfq.actions";

// ============================================================
// TYPES
// ============================================================

interface RfqData {
  id: string;
  number: string;
  title: string;
  lineItems: {
    id: string;
    quantity: number;
    targetPrice: number | null;
    product: {
      id: string;
      name: string;
      sku: string;
      uom: string;
    };
  }[];
  quotations: {
    id: string;
    number: string;
    revision: number;
    status: string;
    totalAmount: number;
    freight: number;
    vendor: {
      id: string;
      name: string;
      code: string;
      rating: number;
    };
    items: {
      id: string;
      unitPrice: number;
      quantity: number;
      taxPercent: number;
      taxAmount: number;
      totalPrice: number;
      deliveryDays: number | null;
      rfqLineItem: {
        id: string;
        product: { id: string; name: string; sku: string };
      };
    }[];
  }[];
}

// ============================================================
// PAGE
// ============================================================

export default function QuoteComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isPending, startTransition] = useTransition();
  const [rfq, setRfq] = useState<RfqData | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getRfq(id);
        setRfq(data as unknown as RfqData);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load RFQ"
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!rfq && isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading comparison...
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        RFQ not found
      </div>
    );
  }

  // Only show received/under-review quotations (exclude rejected)
  const activeQuotations = rfq.quotations.filter(
    (q) => q.status !== "REJECTED" && q.status !== "EXPIRED"
  );

  // Get unique latest-revision quotations per vendor
  const latestByVendor = new Map<string, (typeof activeQuotations)[number]>();
  for (const q of activeQuotations) {
    const existing = latestByVendor.get(q.vendor.id);
    if (!existing || q.revision > existing.revision) {
      latestByVendor.set(q.vendor.id, q);
    }
  }
  const quotationsToCompare = Array.from(latestByVendor.values());
  const vendorsInComparison = quotationsToCompare.map((q) => q.vendor);

  if (quotationsToCompare.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Compare Quotes - ${rfq.number}`}
          description={rfq.title}
        >
          <Button variant="outline" render={<Link href={`/rfq/${id}`} />}>
            <ArrowLeft className="mr-1.5 size-4" />
            Back to RFQ
          </Button>
        </PageHeader>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No quotations available for comparison.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Compare Quotes - ${rfq.number}`}
        description={rfq.title}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href={`/rfq/${id}`} />}>
            <ArrowLeft className="mr-1.5 size-4" />
            Back to RFQ
          </Button>
          {selectedVendorId && (
            <Button
              render={
                <Link
                  href={`/purchase-orders/new?rfqId=${id}&vendorId=${selectedVendorId}`}
                />
              }
            >
              <ShoppingCart className="mr-1.5 size-4" />
              Create PO
            </Button>
          )}
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Quote Comparison Matrix ({quotationsToCompare.length} vendors)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QuoteComparisonMatrix
            lineItems={rfq.lineItems}
            quotations={quotationsToCompare}
            vendors={vendorsInComparison}
            selectedVendorId={selectedVendorId}
            onSelectVendor={setSelectedVendorId}
          />
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="size-4 rounded bg-green-50 border border-green-200 dark:bg-green-950/30" />
              <span className="text-muted-foreground">Lowest price</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-4 rounded bg-red-50 border border-red-200 dark:bg-red-950/30" />
              <span className="text-muted-foreground">Highest price</span>
            </div>
            <div className="text-muted-foreground">
              Score weights: Price 40% | Delivery 25% | Rating 25% | Terms 10%
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
