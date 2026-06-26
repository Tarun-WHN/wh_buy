"use client";

import * as React from "react";
import { useState, useEffect, useTransition, use } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, X } from "lucide-react";
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
import { getVendorOrderDetail } from "../actions";
import { vendorAcceptPo, vendorRejectPo } from "@/actions/po.actions";

// ============================================================
// TYPES
// ============================================================

interface PoData {
  id: string;
  number: string;
  status: string;
  revision: number;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  deliveryDate: string | null;
  shippingAddress: string | null;
  subtotal: number;
  taxAmount: number;
  freightAmount: number;
  totalAmount: number;
  remarks: string | null;
  vendorAcceptedAt: string | null;
  vendorRejectedAt: string | null;
  vendorRejectReason: string | null;
  createdAt: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
    address: string | null;
  };
  createdBy: { name: string };
  lineItems: {
    id: string;
    productName: string;
    sku: string;
    uom: string;
    quantity: number;
    unitPrice: number;
    taxPercent: number;
    taxAmount: number;
    totalPrice: number;
    deliveredQty: number;
    remarks: string | null;
  }[];
}

// ============================================================
// PAGE
// ============================================================

export default function VendorOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isPending, startTransition] = useTransition();
  const [po, setPo] = useState<PoData | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    loadPo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function loadPo() {
    startTransition(async () => {
      try {
        const data = await getVendorOrderDetail(id);
        setPo(data as unknown as PoData);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load order"
        );
      }
    });
  }

  async function handleAccept() {
    try {
      await vendorAcceptPo(id);
      toast.success("Purchase Order accepted");
      loadPo();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to accept"
      );
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    try {
      await vendorRejectPo(id, rejectReason);
      toast.success("Purchase Order rejected");
      setShowRejectForm(false);
      loadPo();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject"
      );
    }
  }

  if (!po && isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading Order...
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Order not found
      </div>
    );
  }

  const isSent = po.status === "SENT";

  return (
    <div className="space-y-6">
      <PageHeader
        title={po.number}
        description={`Rev ${po.revision} - ${po.warehouse.name}`}
      >
        <Button
          variant="outline"
          render={<Link href="/vendor-portal/orders" />}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </PageHeader>

      {/* Status & Action Buttons */}
      {isSent && !showRejectForm && (
        <div className="flex items-center gap-3">
          <Button onClick={handleAccept} disabled={isPending}>
            <Check className="mr-1.5 size-4" />
            Accept Order
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowRejectForm(true)}
            disabled={isPending}
          >
            <X className="mr-1.5 size-4" />
            Reject Order
          </Button>
        </div>
      )}

      {showRejectForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Label htmlFor="rejectReason">
                Rejection Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please explain why you are rejecting this order..."
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isPending}
                >
                  Confirm Rejection
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRejectForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendor Response Status */}
      {po.vendorAcceptedAt && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-700">
            You accepted this order on{" "}
            {formatDateTime(po.vendorAcceptedAt)}
          </p>
        </div>
      )}
      {po.vendorRejectedAt && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            You rejected this order on{" "}
            {formatDateTime(po.vendorRejectedAt)}
          </p>
          {po.vendorRejectReason && (
            <p className="mt-1 text-sm text-red-600">
              Reason: {po.vendorRejectReason}
            </p>
          )}
        </div>
      )}

      {/* PO Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">
                <StatusBadge status={po.status} />
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Warehouse</Label>
              <p className="mt-1 text-sm font-medium">
                {po.warehouse.name} ({po.warehouse.code})
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Created By</Label>
              <p className="mt-1 text-sm font-medium">
                {po.createdBy.name}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p className="mt-1 text-sm font-medium">
                {formatDate(po.createdAt)}
              </p>
            </div>
            {po.deliveryDate && (
              <div>
                <Label className="text-muted-foreground">
                  Expected Delivery
                </Label>
                <p className="mt-1 text-sm font-medium">
                  {formatDate(po.deliveryDate)}
                </p>
              </div>
            )}
            {po.paymentTerms && (
              <div>
                <Label className="text-muted-foreground">Payment Terms</Label>
                <p className="mt-1 text-sm font-medium">
                  {po.paymentTerms}
                </p>
              </div>
            )}
            {po.deliveryTerms && (
              <div>
                <Label className="text-muted-foreground">
                  Delivery Terms
                </Label>
                <p className="mt-1 text-sm font-medium">
                  {po.deliveryTerms}
                </p>
              </div>
            )}
            {po.shippingAddress && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Label className="text-muted-foreground">
                  Shipping Address
                </Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {po.shippingAddress}
                </p>
              </div>
            )}
            {po.remarks && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Label className="text-muted-foreground">Remarks</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {po.remarks}
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
            Line Items ({po.lineItems.length})
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
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax %</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.lineItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {item.productName}
                    </TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.uom}</TableCell>
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
                    <TableCell className="text-right">
                      {item.deliveredQty} / {item.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(po.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(po.taxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Freight</span>
                <span>{formatCurrency(po.freightAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>Grand Total</span>
                <span>{formatCurrency(po.totalAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Tracking (placeholder for accepted orders) */}
      {(po.status === "ACKNOWLEDGED" ||
        po.status === "PARTIALLY_DELIVERED" ||
        po.status === "FULLY_DELIVERED") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="py-4 text-center text-sm text-muted-foreground">
              Delivery tracking will be available here once shipments are
              created.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
