"use client";

import * as React from "react";
import { useState, useEffect, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Trash2,
  Edit,
  CheckCircle,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PoProjectAssign } from "@/components/po-project-assign";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { ApprovalTimeline } from "@/components/approval/approval-timeline";
import {
  getPurchaseOrder,
  submitForApproval,
  sendToVendor,
  deletePurchaseOrder,
} from "@/actions/po.actions";

// ============================================================
// TYPES
// ============================================================

interface PoData {
  id: string;
  number: string;
  rfqId: string | null;
  projectId: string | null;
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
  updatedAt: string;
  vendor: {
    id: string;
    name: string;
    code: string;
    email: string;
    phone: string;
    contactPerson: string;
    address: string | null;
    gstNumber: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
    address: string | null;
  };
  createdBy: { id: string; name: string };
  lineItems: {
    id: string;
    productId: string;
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
  approvals: {
    id: string;
    entity: string;
    status: string;
    currentLevel: number;
    totalAmount: number;
    actions: {
      id: string;
      level: number;
      action: string;
      comments: string | null;
      actionAt: string;
      actionBy: { id: string; name: string };
    }[];
  }[];
  deliveries: {
    id: string;
    number: string;
    status: string;
    expectedDate: string | null;
    deliveredDate: string | null;
  }[];
}

// ============================================================
// PAGE
// ============================================================

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [po, setPo] = useState<PoData | null>(null);

  useEffect(() => {
    loadPo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function loadPo() {
    startTransition(async () => {
      try {
        const data = await getPurchaseOrder(id);
        setPo(data as unknown as PoData);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load Purchase Order"
        );
      }
    });
  }

  async function handleSubmitForApproval() {
    try {
      await submitForApproval(id);
      toast.success("Purchase Order submitted for approval");
      loadPo();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit for approval"
      );
    }
  }

  async function handleSendToVendor() {
    try {
      await sendToVendor(id);
      toast.success("Purchase Order sent to vendor");
      loadPo();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send to vendor"
      );
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this Purchase Order?"))
      return;
    try {
      await deletePurchaseOrder(id);
      toast.success("Purchase Order deleted");
      router.push("/purchase-orders");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete"
      );
    }
  }

  if (!po && isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading Purchase Order...
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Purchase Order not found
      </div>
    );
  }

  const isDraft = po.status === "DRAFT";
  const isApproved = po.status === "APPROVED";
  const isSent = po.status === "SENT";
  const isAccepted =
    po.status === "ACKNOWLEDGED" ||
    po.status === "PARTIALLY_DELIVERED" ||
    po.status === "FULLY_DELIVERED";

  const latestApproval = po.approvals.length > 0 ? po.approvals[0] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={po.number}
        description={`Rev ${po.revision} - ${po.vendor.name}`}
      >
        <Button
          variant="outline"
          render={<Link href="/purchase-orders" />}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </PageHeader>

      <PoProjectAssign poId={po.id} initialProjectId={po.projectId} />

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {isDraft && (
          <>
            <Button
              variant="outline"
              render={<Link href={`/purchase-orders/${id}/edit`} />}
              disabled={isPending}
            >
              <Edit className="mr-1.5 size-4" />
              Edit
            </Button>
            <Button
              onClick={handleSubmitForApproval}
              disabled={isPending}
            >
              <CheckCircle className="mr-1.5 size-4" />
              Submit for Approval
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="mr-1.5 size-4" />
              Delete
            </Button>
          </>
        )}
        {isApproved && (
          <Button onClick={handleSendToVendor} disabled={isPending}>
            <Send className="mr-1.5 size-4" />
            Send to Vendor
          </Button>
        )}
        {isAccepted && (
          <Button
            render={
              <Link
                href={`/deliveries/new?poId=${id}`}
              />
            }
          >
            <Truck className="mr-1.5 size-4" />
            Create Delivery
          </Button>
        )}
      </div>

      {/* Status & Totals Header */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Status</Label>
            <div className="mt-1">
              <StatusBadge status={po.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Subtotal</Label>
            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(po.subtotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Tax + Freight</Label>
            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(po.taxAmount + po.freightAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Grand Total</Label>
            <p className="mt-1 text-lg font-semibold text-primary">
              {formatCurrency(po.totalAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="lineitems">
        <TabsList>
          <TabsTrigger value="lineitems">
            Line Items ({po.lineItems.length})
          </TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="approval">Approval Status</TabsTrigger>
          <TabsTrigger value="vendor">Vendor Response</TabsTrigger>
          <TabsTrigger value="deliveries">
            Deliveries ({po.deliveries.length})
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* LINE ITEMS TAB */}
        {/* ============================================================ */}
        <TabsContent value="lineitems">
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
                      <TableHead className="text-right">Tax Amt</TableHead>
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
                        <TableCell className="text-right">
                          {formatCurrency(item.taxAmount)}
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
        </TabsContent>

        {/* ============================================================ */}
        {/* DETAILS TAB */}
        {/* ============================================================ */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PO Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground">Vendor</Label>
                  <p className="mt-1 text-sm font-medium">
                    {po.vendor.name} ({po.vendor.code})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {po.vendor.email} | {po.vendor.phone}
                  </p>
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
                  <Label className="text-muted-foreground">Created At</Label>
                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(po.createdAt)}
                  </p>
                </div>
                {po.deliveryDate && (
                  <div>
                    <Label className="text-muted-foreground">
                      Delivery Date
                    </Label>
                    <p className="mt-1 text-sm font-medium">
                      {formatDate(po.deliveryDate)}
                    </p>
                  </div>
                )}
                {po.paymentTerms && (
                  <div>
                    <Label className="text-muted-foreground">
                      Payment Terms
                    </Label>
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
        </TabsContent>

        {/* ============================================================ */}
        {/* APPROVAL STATUS TAB */}
        {/* ============================================================ */}
        <TabsContent value="approval">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approval Status</CardTitle>
            </CardHeader>
            <CardContent>
              {latestApproval ? (
                <ApprovalTimeline
                  actions={
                    latestApproval.actions as unknown as {
                      id: string;
                      level: number;
                      action: string;
                      comments: string | null;
                      actionAt: string;
                      actionBy: { id: string; name: string };
                    }[]
                  }
                  currentLevel={latestApproval.currentLevel}
                  status={latestApproval.status}
                />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No approval workflow initiated yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* VENDOR RESPONSE TAB */}
        {/* ============================================================ */}
        <TabsContent value="vendor">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vendor Response</CardTitle>
            </CardHeader>
            <CardContent>
              {po.vendorAcceptedAt ? (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700">
                      Accepted by Vendor
                    </p>
                    <p className="text-xs text-green-600">
                      {formatDateTime(po.vendorAcceptedAt)}
                    </p>
                  </div>
                </div>
              ) : po.vendorRejectedAt ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                    <div>
                      <p className="text-sm font-medium text-red-700">
                        Rejected by Vendor
                      </p>
                      <p className="text-xs text-red-600">
                        {formatDateTime(po.vendorRejectedAt)}
                      </p>
                    </div>
                  </div>
                  {po.vendorRejectReason && (
                    <div className="rounded-lg border p-3">
                      <Label className="text-muted-foreground">
                        Rejection Reason
                      </Label>
                      <p className="mt-1 text-sm">{po.vendorRejectReason}</p>
                    </div>
                  )}
                </div>
              ) : isSent ? (
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div>
                    <p className="text-sm font-medium text-amber-700">
                      Waiting for vendor response
                    </p>
                    <p className="text-xs text-amber-600">
                      PO has been sent to {po.vendor.name}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  PO has not been sent to vendor yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* DELIVERIES TAB */}
        {/* ============================================================ */}
        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Deliveries ({po.deliveries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {po.deliveries.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No deliveries created yet.
                </p>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Delivery #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expected Date</TableHead>
                        <TableHead>Delivered Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {po.deliveries.map((del) => (
                        <TableRow key={del.id}>
                          <TableCell>
                            <Link
                              href={`/deliveries/${del.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {del.number}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={del.status} />
                          </TableCell>
                          <TableCell>
                            {del.expectedDate
                              ? formatDate(del.expectedDate)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {del.deliveredDate
                              ? formatDate(del.deliveredDate)
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
