"use client";

import * as React from "react";
import { useState, useEffect, useTransition, use } from "react";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
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
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { getVendorRfqDetail, getVendorId } from "../actions";
import { createQuotation, reviseQuotation } from "@/actions/quotation.actions";

// ============================================================
// TYPES
// ============================================================

interface RfqDetail {
  rfq: {
    id: string;
    number: string;
    title: string;
    rfqType: string;
    status: string;
    submissionDeadline: string | null;
    termsConditions: string | null;
    deliveryLocation: string | null;
    lineItems: {
      id: string;
      quantity: number;
      specifications: string | null;
      targetPrice: number | null;
      product: {
        id: string;
        name: string;
        sku: string;
        uom: string;
        gstPercent: number;
      };
    }[];
  };
  rfqVendor: {
    id: string;
    status: string;
  };
  existingQuotation: {
    id: string;
    number: string;
    revision: number;
    status: string;
    totalAmount: number;
    validUntil: string | null;
    paymentTerms: string | null;
    deliveryTerms: string | null;
    warranty: string | null;
    freight: number;
    remarks: string | null;
    submittedAt: string | null;
    items: {
      id: string;
      unitPrice: number;
      quantity: number;
      taxPercent: number;
      taxAmount: number;
      totalPrice: number;
      deliveryDays: number | null;
      warranty: string | null;
      remarks: string | null;
      rfqLineItem: {
        id: string;
        product: { id: string; name: string; sku: string };
      };
    }[];
  } | null;
}

interface QuoteItem {
  rfqLineItemId: string;
  productName: string;
  sku: string;
  uom: string;
  requestedQty: number;
  unitPrice: string;
  quantity: string;
  taxPercent: string;
  deliveryDays: string;
  warranty: string;
  remarks: string;
}

// ============================================================
// PAGE
// ============================================================

export default function VendorRfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isPending, startTransition] = useTransition();
  const [detail, setDetail] = useState<RfqDetail | null>(null);
  const [isRevising, setIsRevising] = useState(false);

  // Quotation form state
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [freight, setFreight] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [warranty, setWarranty] = useState("");
  const [qRemarks, setQRemarks] = useState("");

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function loadDetail() {
    startTransition(async () => {
      try {
        const data = await getVendorRfqDetail(id);
        setDetail(data as unknown as RfqDetail);
        initQuoteForm(data as unknown as RfqDetail);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load RFQ"
        );
      }
    });
  }

  function initQuoteForm(data: RfqDetail) {
    const existing = data.existingQuotation;

    if (existing && !isRevising) {
      // Prefill from existing quotation
      setPaymentTerms(existing.paymentTerms || "");
      setDeliveryTerms(existing.deliveryTerms || "");
      setFreight(String(existing.freight));
      setValidUntil(existing.validUntil ? existing.validUntil.split("T")[0] : "");
      setWarranty(existing.warranty || "");
      setQRemarks(existing.remarks || "");

      setQuoteItems(
        data.rfq.lineItems.map((li) => {
          const existingItem = existing.items.find(
            (ei) => ei.rfqLineItem.id === li.id
          );
          return {
            rfqLineItemId: li.id,
            productName: li.product.name,
            sku: li.product.sku,
            uom: li.product.uom,
            requestedQty: li.quantity,
            unitPrice: existingItem ? String(existingItem.unitPrice) : "",
            quantity: existingItem
              ? String(existingItem.quantity)
              : String(li.quantity),
            taxPercent: existingItem
              ? String(existingItem.taxPercent)
              : String(li.product.gstPercent),
            deliveryDays: existingItem?.deliveryDays
              ? String(existingItem.deliveryDays)
              : "",
            warranty: existingItem?.warranty || "",
            remarks: existingItem?.remarks || "",
          };
        })
      );
    } else {
      // Fresh form
      setQuoteItems(
        data.rfq.lineItems.map((li) => ({
          rfqLineItemId: li.id,
          productName: li.product.name,
          sku: li.product.sku,
          uom: li.product.uom,
          requestedQty: li.quantity,
          unitPrice: "",
          quantity: String(li.quantity),
          taxPercent: String(li.product.gstPercent),
          deliveryDays: "",
          warranty: "",
          remarks: "",
        }))
      );
    }
  }

  function updateQuoteItem(
    index: number,
    field: keyof QuoteItem,
    value: string
  ) {
    setQuoteItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function calcItemTotal(item: QuoteItem) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const tax = parseFloat(item.taxPercent) || 0;
    const base = qty * price;
    const taxAmt = (base * tax) / 100;
    return base + taxAmt;
  }

  const itemsTotal = quoteItems.reduce((sum, item) => sum + calcItemTotal(item), 0);
  const grandTotal = itemsTotal + (parseFloat(freight) || 0);

  async function handleSubmitQuotation() {
    const invalidItems = quoteItems.filter(
      (i) => !i.unitPrice || parseFloat(i.unitPrice) <= 0
    );
    if (invalidItems.length > 0) {
      toast.error("Please enter a valid unit price for all items");
      return;
    }

    try {
      if (detail?.existingQuotation && isRevising) {
        await reviseQuotation(detail.existingQuotation.id, {
          validUntil: validUntil || undefined,
          paymentTerms: paymentTerms || undefined,
          deliveryTerms: deliveryTerms || undefined,
          warranty: warranty || undefined,
          freight: parseFloat(freight) || 0,
          remarks: qRemarks || undefined,
          items: quoteItems.map((qi) => ({
            rfqLineItemId: qi.rfqLineItemId,
            unitPrice: parseFloat(qi.unitPrice),
            quantity: parseFloat(qi.quantity) || qi.requestedQty,
            taxPercent: parseFloat(qi.taxPercent) || 0,
            deliveryDays: qi.deliveryDays
              ? parseInt(qi.deliveryDays)
              : undefined,
            warranty: qi.warranty || undefined,
            remarks: qi.remarks || undefined,
          })),
        });
        toast.success("Quotation revised successfully");
      } else {
        const vendorId = await getVendorId();
        await createQuotation({
          rfqId: id,
          vendorId,
          validUntil: validUntil || undefined,
          paymentTerms: paymentTerms || undefined,
          deliveryTerms: deliveryTerms || undefined,
          warranty: warranty || undefined,
          freight: parseFloat(freight) || 0,
          remarks: qRemarks || undefined,
          items: quoteItems.map((qi) => ({
            rfqLineItemId: qi.rfqLineItemId,
            unitPrice: parseFloat(qi.unitPrice),
            quantity: parseFloat(qi.quantity) || qi.requestedQty,
            taxPercent: parseFloat(qi.taxPercent) || 0,
            deliveryDays: qi.deliveryDays
              ? parseInt(qi.deliveryDays)
              : undefined,
            warranty: qi.warranty || undefined,
            remarks: qi.remarks || undefined,
          })),
        });
        toast.success("Quotation submitted successfully");
      }

      setIsRevising(false);
      loadDetail();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit quotation"
      );
    }
  }

  if (!detail && isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading RFQ...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        RFQ not found
      </div>
    );
  }

  const { rfq, existingQuotation } = detail;
  const hasQuotation = !!existingQuotation;
  const showForm = !hasQuotation || isRevising;

  return (
    <div className="space-y-6">
      <PageHeader
        title={rfq.number}
        description={rfq.title}
      >
        <Button
          variant="outline"
          render={<Link href="/vendor-portal/rfqs" />}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </PageHeader>

      {/* RFQ Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">RFQ Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">
                <StatusBadge status={rfq.status} />
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Type</Label>
              <p className="mt-1 text-sm font-medium uppercase">
                {rfq.rfqType}
              </p>
            </div>
            {rfq.submissionDeadline && (
              <div>
                <Label className="text-muted-foreground">Deadline</Label>
                <p className="mt-1 text-sm font-medium">
                  {formatDateTime(rfq.submissionDeadline)}
                </p>
              </div>
            )}
            {rfq.deliveryLocation && (
              <div>
                <Label className="text-muted-foreground">
                  Delivery Location
                </Label>
                <p className="mt-1 text-sm font-medium">
                  {rfq.deliveryLocation}
                </p>
              </div>
            )}
            {rfq.termsConditions && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Label className="text-muted-foreground">
                  Terms & Conditions
                </Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {rfq.termsConditions}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Requested Items ({rfq.lineItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Target Price</TableHead>
                  <TableHead>Specifications</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfq.lineItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {item.product.name}
                    </TableCell>
                    <TableCell>{item.product.sku}</TableCell>
                    <TableCell>{item.product.uom}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.targetPrice
                        ? formatCurrency(item.targetPrice)
                        : "-"}
                    </TableCell>
                    <TableCell>{item.specifications || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Existing Quotation Display */}
      {hasQuotation && !isRevising && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Your Quotation ({existingQuotation.number} - Rev{" "}
              {existingQuotation.revision})
            </CardTitle>
            <div className="flex items-center gap-2">
              <StatusBadge status={existingQuotation.status} />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsRevising(true);
                  initQuoteForm(detail);
                }}
              >
                Revise
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Tax %</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Delivery Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {existingQuotation.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.rfqLineItem.product.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.taxPercent}%
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                      <TableCell>
                        {item.deliveryDays
                          ? `${item.deliveryDays} days`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex justify-end">
              <div className="w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Freight</span>
                  <span>{formatCurrency(existingQuotation.freight)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <span>Total</span>
                  <span>
                    {formatCurrency(existingQuotation.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {existingQuotation.submittedAt && (
              <p className="mt-3 text-xs text-muted-foreground">
                Submitted on {formatDateTime(existingQuotation.submittedAt)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quotation Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isRevising ? "Revise Quotation" : "Submit Quotation"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Per-item pricing */}
            <div className="space-y-4">
              {quoteItems.map((item, index) => (
                <div
                  key={item.rfqLineItemId}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {item.productName}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({item.sku} - {item.uom}) | Requested Qty:{" "}
                        {item.requestedQty}
                      </span>
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(calcItemTotal(item))}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="grid gap-1">
                      <Label className="text-xs">
                        Unit Price <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateQuoteItem(index, "unitPrice", e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuoteItem(index, "quantity", e.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Tax %</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.taxPercent}
                        onChange={(e) =>
                          updateQuoteItem(index, "taxPercent", e.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Delivery Days</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.deliveryDays}
                        onChange={(e) =>
                          updateQuoteItem(
                            index,
                            "deliveryDays",
                            e.target.value
                          )
                        }
                        placeholder="Days"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Warranty</Label>
                      <Input
                        value={item.warranty}
                        onChange={(e) =>
                          updateQuoteItem(index, "warranty", e.target.value)
                        }
                        placeholder="e.g., 1 year"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Remarks</Label>
                      <Input
                        value={item.remarks}
                        onChange={(e) =>
                          updateQuoteItem(index, "remarks", e.target.value)
                        }
                        placeholder="Remarks"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Overall Terms */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g., Net 30"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deliveryTerms">Delivery Terms</Label>
                <Input
                  id="deliveryTerms"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  placeholder="e.g., FOB Destination"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="freight">Freight</Label>
                <Input
                  id="freight"
                  type="number"
                  min="0"
                  step="0.01"
                  value={freight}
                  onChange={(e) => setFreight(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qWarranty">Overall Warranty</Label>
                <Input
                  id="qWarranty"
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                  placeholder="e.g., 1 year"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qRemarks">Remarks</Label>
                <Textarea
                  id="qRemarks"
                  value={qRemarks}
                  onChange={(e) => setQRemarks(e.target.value)}
                  placeholder="Any additional remarks"
                  rows={1}
                />
              </div>
            </div>

            {/* Total & Submit */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Grand Total: </span>
                <span className="text-lg font-semibold">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <div className="flex gap-2">
                {isRevising && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsRevising(false);
                      initQuoteForm(detail);
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={handleSubmitQuotation}
                  disabled={isPending}
                >
                  <Send className="mr-1.5 size-4" />
                  {isPending
                    ? "Submitting..."
                    : isRevising
                      ? "Submit Revision"
                      : "Submit Quotation"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
