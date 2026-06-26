"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";

// ============================================================
// TYPES
// ============================================================

interface ProductInfo {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

interface LineItemData {
  id: string;
  quantity: number;
  targetPrice: number | null;
  product: ProductInfo;
}

interface QuotationItemData {
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
}

interface VendorInfo {
  id: string;
  name: string;
  code: string;
  rating: number;
}

interface QuotationData {
  id: string;
  number: string;
  revision: number;
  status: string;
  totalAmount: number;
  freight: number;
  vendor: VendorInfo;
  items: QuotationItemData[];
}

export interface QuoteComparisonMatrixProps {
  lineItems: LineItemData[];
  quotations: QuotationData[];
  vendors: VendorInfo[];
  onSelectVendor?: (vendorId: string) => void;
  selectedVendorId?: string;
}

// ============================================================
// SCORING
// ============================================================

interface VendorScore {
  vendorId: string;
  priceScore: number;
  deliveryScore: number;
  ratingScore: number;
  termsScore: number;
  totalScore: number;
}

function calculateScores(
  quotations: QuotationData[],
  vendors: VendorInfo[]
): VendorScore[] {
  if (quotations.length === 0) return [];

  const totals = quotations.map((q) => q.totalAmount);
  const minTotal = Math.min(...totals);
  const maxTotal = Math.max(...totals);

  // Average delivery days per quotation
  const avgDeliveryDays = quotations.map((q) => {
    const items = q.items.filter((i) => i.deliveryDays != null);
    if (items.length === 0) return 30; // default
    return items.reduce((s, i) => s + (i.deliveryDays ?? 30), 0) / items.length;
  });
  const minDelivery = Math.min(...avgDeliveryDays);
  const maxDelivery = Math.max(...avgDeliveryDays);

  const ratings = vendors.map((v) => {
    const q = quotations.find((q) => q.vendor.id === v.id);
    return q ? v.rating : 0;
  });
  const maxRating = Math.max(...ratings, 1);

  return quotations.map((q, idx) => {
    const vendor = vendors.find((v) => v.id === q.vendor.id);
    const rating = vendor?.rating ?? 0;

    // Price score: lower is better (0-100)
    const priceScore =
      maxTotal === minTotal
        ? 100
        : ((maxTotal - q.totalAmount) / (maxTotal - minTotal)) * 100;

    // Delivery score: fewer days is better (0-100)
    const deliveryScore =
      maxDelivery === minDelivery
        ? 100
        : ((maxDelivery - avgDeliveryDays[idx]) / (maxDelivery - minDelivery)) *
          100;

    // Rating score: higher is better (0-100)
    const ratingScore = maxRating > 0 ? (rating / maxRating) * 100 : 50;

    // Terms score: use freight as proxy (lower freight = better)
    const freights = quotations.map((q) => q.freight);
    const maxFreight = Math.max(...freights, 1);
    const minFreight = Math.min(...freights);
    const termsScore =
      maxFreight === minFreight
        ? 100
        : ((maxFreight - q.freight) / (maxFreight - minFreight)) * 100;

    // Weighted total: price 40%, delivery 25%, rating 25%, terms 10%
    const totalScore =
      priceScore * 0.4 +
      deliveryScore * 0.25 +
      ratingScore * 0.25 +
      termsScore * 0.1;

    return {
      vendorId: q.vendor.id,
      priceScore: Math.round(priceScore),
      deliveryScore: Math.round(deliveryScore),
      ratingScore: Math.round(ratingScore),
      termsScore: Math.round(termsScore),
      totalScore: Math.round(totalScore),
    };
  });
}

// ============================================================
// COMPONENT
// ============================================================

export function QuoteComparisonMatrix({
  lineItems,
  quotations,
  vendors,
  onSelectVendor,
  selectedVendorId,
}: QuoteComparisonMatrixProps) {
  const scores = calculateScores(quotations, vendors);
  const bestVendorId =
    scores.length > 0
      ? scores.reduce((best, s) => (s.totalScore > best.totalScore ? s : best))
          .vendorId
      : null;

  // Build price map per line item per vendor
  // key: `${lineItemId}-${vendorId}` -> QuotationItemData
  const priceMap = new Map<string, QuotationItemData>();
  for (const q of quotations) {
    for (const item of q.items) {
      priceMap.set(`${item.rfqLineItem.id}-${q.vendor.id}`, item);
    }
  }

  // Get min/max unit price per line item for highlighting
  const minMaxPerLine = new Map<
    string,
    { min: number; max: number }
  >();
  for (const li of lineItems) {
    const prices: number[] = [];
    for (const q of quotations) {
      const cell = priceMap.get(`${li.id}-${q.vendor.id}`);
      if (cell) prices.push(cell.unitPrice);
    }
    if (prices.length > 0) {
      minMaxPerLine.set(li.id, {
        min: Math.min(...prices),
        max: Math.max(...prices),
      });
    }
  }

  function getCellBg(lineItemId: string, unitPrice: number): string {
    const mm = minMaxPerLine.get(lineItemId);
    if (!mm || mm.min === mm.max) return "";
    if (unitPrice === mm.min) return "bg-green-50 dark:bg-green-950/30";
    if (unitPrice === mm.max) return "bg-red-50 dark:bg-red-950/30";
    return "";
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-background min-w-[200px]">
              Product
            </TableHead>
            <TableHead className="sticky left-0 z-10 bg-background text-right">
              Qty
            </TableHead>
            {quotations.map((q) => (
              <TableHead
                key={q.vendor.id}
                className={cn(
                  "text-center min-w-[180px]",
                  selectedVendorId === q.vendor.id && "bg-primary/5"
                )}
              >
                <div className="space-y-1">
                  <p className="font-medium">{q.vendor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.vendor.code}
                  </p>
                  {bestVendorId === q.vendor.id && (
                    <StatusBadge status="RECOMMENDED" />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Item rows */}
          {lineItems.map((li) => (
            <TableRow key={li.id}>
              <TableCell className="sticky left-0 z-10 bg-background font-medium">
                <div>
                  <p>{li.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {li.product.sku} &middot; {li.product.uom}
                  </p>
                </div>
              </TableCell>
              <TableCell className="sticky left-0 z-10 bg-background text-right">
                {li.quantity}
              </TableCell>
              {quotations.map((q) => {
                const cell = priceMap.get(`${li.id}-${q.vendor.id}`);
                if (!cell) {
                  return (
                    <TableCell
                      key={q.vendor.id}
                      className="text-center text-muted-foreground"
                    >
                      -
                    </TableCell>
                  );
                }
                return (
                  <TableCell
                    key={q.vendor.id}
                    className={cn(
                      "text-center",
                      getCellBg(li.id, cell.unitPrice),
                      selectedVendorId === q.vendor.id && "bg-primary/5"
                    )}
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium">
                        {formatCurrency(cell.unitPrice)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tax: {cell.taxPercent}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total: {formatCurrency(cell.totalPrice)}
                      </p>
                      {cell.deliveryDays != null && (
                        <p className="text-xs text-muted-foreground">
                          {cell.deliveryDays} days
                        </p>
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}

          {/* Summary row */}
          <TableRow className="border-t-2 font-semibold">
            <TableCell className="sticky left-0 z-10 bg-background" colSpan={2}>
              Total Amount
            </TableCell>
            {quotations.map((q) => (
              <TableCell
                key={q.vendor.id}
                className={cn(
                  "text-center",
                  selectedVendorId === q.vendor.id && "bg-primary/5"
                )}
              >
                <div className="space-y-0.5">
                  <p>{formatCurrency(q.totalAmount)}</p>
                  {q.freight > 0 && (
                    <p className="text-xs font-normal text-muted-foreground">
                      (incl. freight {formatCurrency(q.freight)})
                    </p>
                  )}
                </div>
              </TableCell>
            ))}
          </TableRow>

          {/* Score row */}
          <TableRow className="bg-muted/30">
            <TableCell className="sticky left-0 z-10 bg-muted/30 font-semibold" colSpan={2}>
              Recommendation Score
            </TableCell>
            {quotations.map((q) => {
              const score = scores.find((s) => s.vendorId === q.vendor.id);
              return (
                <TableCell
                  key={q.vendor.id}
                  className={cn(
                    "text-center",
                    selectedVendorId === q.vendor.id && "bg-primary/5"
                  )}
                >
                  {score ? (
                    <div className="space-y-1">
                      <p className="text-lg font-bold">
                        {score.totalScore}/100
                      </p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Price: {score.priceScore}</p>
                        <p>Delivery: {score.deliveryScore}</p>
                        <p>Rating: {score.ratingScore}</p>
                        <p>Terms: {score.termsScore}</p>
                      </div>
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
              );
            })}
          </TableRow>

          {/* Select row */}
          {onSelectVendor && (
            <TableRow>
              <TableCell className="sticky left-0 z-10 bg-background" colSpan={2} />
              {quotations.map((q) => (
                <TableCell key={q.vendor.id} className="text-center">
                  <button
                    type="button"
                    onClick={() => onSelectVendor(q.vendor.id)}
                    className={cn(
                      "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      selectedVendorId === q.vendor.id
                        ? "bg-primary text-primary-foreground"
                        : "border border-input bg-background hover:bg-muted"
                    )}
                  >
                    {selectedVendorId === q.vendor.id ? "Selected" : "Select"}
                  </button>
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
