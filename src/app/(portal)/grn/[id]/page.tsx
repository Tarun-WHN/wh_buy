"use client";

import * as React from "react";
import { useState, useEffect, useTransition, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/utils";
import { getGrn, uploadGrnPhoto } from "@/actions/grn.actions";

// ============================================================
// TYPES
// ============================================================

interface GrnData {
  id: string;
  number: string;
  status: string;
  receivedDate: string;
  receivedBy: string;
  remarks: string | null;
  createdAt: string;
  delivery: {
    id: string;
    number: string;
    purchaseOrderId: string;
    purchaseOrder: {
      id: string;
      number: string;
      vendor: { id: string; name: string; code: string };
    };
  };
  items: {
    id: string;
    orderedQty: number;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    rejectReason: string | null;
    poLineItem: {
      id: string;
      productName: string;
      sku: string;
      uom: string;
      quantity: number;
      unitPrice: number;
    };
  }[];
  photos: {
    id: string;
    filePath: string;
    caption: string | null;
    createdAt: string;
  }[];
}

// ============================================================
// PAGE
// ============================================================

export default function GrnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isPending, startTransition] = useTransition();
  const [grn, setGrn] = useState<GrnData | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");

  useEffect(() => {
    loadGrn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function loadGrn() {
    startTransition(async () => {
      try {
        const data = await getGrn(id);
        setGrn(data as unknown as GrnData);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load GRN"
        );
      }
    });
  }

  async function handlePhotoUpload() {
    const filePath = prompt("Enter photo file path:");
    if (!filePath) return;
    try {
      await uploadGrnPhoto(id, filePath, photoCaption || undefined);
      toast.success("Photo uploaded");
      setPhotoCaption("");
      loadGrn();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload photo"
      );
    }
  }

  if (!grn && isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading GRN...
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        GRN not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={grn.number}
        description={`GRN for ${grn.delivery.purchaseOrder.vendor.name}`}
      >
        <Button
          variant="outline"
          render={<Link href="/grn" />}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </PageHeader>

      {/* Status & Info Header */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Status</Label>
            <div className="mt-1">
              <StatusBadge status={grn.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Delivery</Label>
            <p className="mt-1">
              <Link
                href={`/delivery/${grn.delivery.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {grn.delivery.number}
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Purchase Order</Label>
            <p className="mt-1">
              <Link
                href={`/purchase-orders/${grn.delivery.purchaseOrder.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {grn.delivery.purchaseOrder.number}
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Received Date</Label>
            <p className="mt-1 text-sm font-medium">
              {formatDateTime(grn.receivedDate)}
            </p>
          </CardContent>
        </Card>
      </div>

      {grn.remarks && (
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Remarks</Label>
            <p className="mt-1 text-sm whitespace-pre-wrap">{grn.remarks}</p>
          </CardContent>
        </Card>
      )}

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Items ({grn.items.length})
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
                  <TableHead className="text-right">Ordered Qty</TableHead>
                  <TableHead className="text-right">Received Qty</TableHead>
                  <TableHead className="text-right">Accepted Qty</TableHead>
                  <TableHead className="text-right">Rejected Qty</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grn.items.map((item, index) => (
                  <TableRow
                    key={item.id}
                    className={
                      item.rejectedQty > 0
                        ? "bg-red-50 dark:bg-red-950/30"
                        : ""
                    }
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {item.poLineItem.productName}
                    </TableCell>
                    <TableCell>{item.poLineItem.sku}</TableCell>
                    <TableCell className="text-right">
                      {item.orderedQty}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.receivedQty}
                    </TableCell>
                    <TableCell className="text-right text-green-700 dark:text-green-300">
                      {item.acceptedQty}
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        item.rejectedQty > 0
                          ? "font-semibold text-red-700 dark:text-red-300"
                          : ""
                      }`}
                    >
                      {item.rejectedQty}
                    </TableCell>
                    <TableCell className="text-red-600 dark:text-red-400">
                      {item.rejectReason || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Photos Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Photos ({grn.photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {grn.photos.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {grn.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="rounded-lg border overflow-hidden"
                >
                  <img
                    src={photo.filePath}
                    alt={photo.caption || "GRN Photo"}
                    className="w-full h-48 object-cover"
                  />
                  {photo.caption && (
                    <div className="p-2 text-sm text-muted-foreground">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No photos uploaded yet.
            </p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Input
              placeholder="Photo caption (optional)"
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              className="max-w-xs"
            />
            <Button
              variant="outline"
              onClick={handlePhotoUpload}
              disabled={isPending}
            >
              <Upload className="mr-1.5 size-4" />
              Upload Photo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
