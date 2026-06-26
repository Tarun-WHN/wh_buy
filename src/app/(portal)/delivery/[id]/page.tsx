"use client";

import * as React from "react";
import { useState, useEffect, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Truck,
  Package,
  Clock,
  CheckCircle,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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
import { formatDate, formatDateTime } from "@/lib/utils";
import { getDelivery, updateDeliveryStatus } from "@/actions/delivery.actions";

// ============================================================
// TYPES
// ============================================================

interface DeliveryData {
  id: string;
  number: string;
  status: string;
  vehicleNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  lrNumber: string | null;
  ewayBillNumber: string | null;
  dispatchDate: string | null;
  expectedDate: string | null;
  deliveredDate: string | null;
  remarks: string | null;
  createdAt: string;
  purchaseOrder: {
    id: string;
    number: string;
    status: string;
    totalAmount: number;
    lineItems: {
      id: string;
      productName: string;
      sku: string;
      uom: string;
      quantity: number;
      unitPrice: number;
      deliveredQty: number;
    }[];
  };
  vendor: {
    id: string;
    name: string;
    code: string;
    email: string;
    phone: string;
    contactPerson: string;
  };
  grns: {
    id: string;
    number: string;
    status: string;
    receivedDate: string;
  }[];
}

// ============================================================
// PAGE
// ============================================================

export default function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [delivery, setDelivery] = useState<DeliveryData | null>(null);

  useEffect(() => {
    loadDelivery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function loadDelivery() {
    startTransition(async () => {
      try {
        const data = await getDelivery(id);
        setDelivery(data as unknown as DeliveryData);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load delivery"
        );
      }
    });
  }

  async function handleStatusUpdate(status: string) {
    try {
      await updateDeliveryStatus(id, status);
      toast.success(`Delivery status updated to ${status.replace(/_/g, " ")}`);
      loadDelivery();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status"
      );
    }
  }

  if (!delivery && isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading Delivery...
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Delivery not found
      </div>
    );
  }

  const statusFlow: Record<string, string[]> = {
    SCHEDULED: ["DISPATCHED"],
    DISPATCHED: ["IN_TRANSIT"],
    IN_TRANSIT: ["DELIVERED", "PARTIALLY_DELIVERED"],
    PARTIALLY_DELIVERED: ["DELIVERED"],
  };

  const nextStatuses = statusFlow[delivery.status] ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={delivery.number}
        description={`Delivery for ${delivery.vendor.name}`}
      >
        <Button
          variant="outline"
          render={<Link href="/delivery" />}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </PageHeader>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {nextStatuses.map((status) => (
          <Button
            key={status}
            onClick={() => handleStatusUpdate(status)}
            disabled={isPending}
            variant={status === "DELIVERED" ? "default" : "outline"}
          >
            {status === "DISPATCHED" && <Truck className="mr-1.5 size-4" />}
            {status === "IN_TRANSIT" && <Truck className="mr-1.5 size-4" />}
            {status === "DELIVERED" && <CheckCircle className="mr-1.5 size-4" />}
            {status === "PARTIALLY_DELIVERED" && <Package className="mr-1.5 size-4" />}
            Mark {status.replace(/_/g, " ")}
          </Button>
        ))}
        <Button
          render={<Link href={`/grn/new?deliveryId=${id}`} />}
        >
          <Plus className="mr-1.5 size-4" />
          Create GRN
        </Button>
      </div>

      {/* Status & Info Header */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Status</Label>
            <div className="mt-1">
              <StatusBadge status={delivery.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Purchase Order</Label>
            <p className="mt-1">
              <Link
                href={`/purchase-orders/${delivery.purchaseOrder.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {delivery.purchaseOrder.number}
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Vendor</Label>
            <p className="mt-1 text-sm font-medium">{delivery.vendor.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Created</Label>
            <p className="mt-1 text-sm font-medium">
              {formatDateTime(delivery.createdAt)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dispatch Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dispatch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-muted-foreground">Vehicle Number</Label>
              <p className="mt-1 text-sm font-medium">
                {delivery.vehicleNumber || "-"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Driver Name</Label>
              <p className="mt-1 text-sm font-medium">
                {delivery.driverName || "-"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Driver Phone</Label>
              <p className="mt-1 text-sm font-medium">
                {delivery.driverPhone || "-"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">LR Number</Label>
              <p className="mt-1 text-sm font-medium">
                {delivery.lrNumber || "-"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">E-Way Bill</Label>
              <p className="mt-1 text-sm font-medium">
                {delivery.ewayBillNumber || "-"}
              </p>
            </div>
            {delivery.remarks && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Label className="text-muted-foreground">Remarks</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {delivery.remarks}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Date Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-8">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Truck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dispatch Date</p>
                <p className="text-sm font-medium">
                  {delivery.dispatchDate
                    ? formatDate(delivery.dispatchDate)
                    : "Not yet dispatched"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected Date</p>
                <p className="text-sm font-medium">
                  {delivery.expectedDate
                    ? formatDate(delivery.expectedDate)
                    : "Not set"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Delivered Date</p>
                <p className="text-sm font-medium">
                  {delivery.deliveredDate
                    ? formatDate(delivery.deliveredDate)
                    : "Not yet delivered"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked GRNs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            GRNs ({delivery.grns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {delivery.grns.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No GRNs created yet.
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delivery.grns.map((grn) => (
                    <TableRow key={grn.id}>
                      <TableCell>
                        <Link
                          href={`/grn/${grn.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {grn.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={grn.status} />
                      </TableCell>
                      <TableCell>
                        {formatDate(grn.receivedDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
