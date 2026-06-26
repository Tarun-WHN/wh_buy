"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDeliveriesForGrn, createGrn } from "@/actions/grn.actions";

// ============================================================
// TYPES
// ============================================================

interface DeliveryOption {
  id: string;
  number: string;
  status: string;
  purchaseOrder: {
    id: string;
    number: string;
    vendor: { id: string; name: string };
    lineItems: {
      id: string;
      productId: string;
      productName: string;
      sku: string;
      uom: string;
      quantity: number;
      unitPrice: number;
      deliveredQty: number;
    }[];
  };
  _count: { grns: number };
}

interface GrnItemInput {
  poLineItemId: string;
  productName: string;
  sku: string;
  uom: string;
  orderedQty: number;
  previouslyReceived: number;
  remainingQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectReason: string;
}

// ============================================================
// PAGE
// ============================================================

export default function CreateGrnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledDeliveryId = searchParams.get("deliveryId");

  const [isPending, startTransition] = useTransition();
  const [deliveries, setDeliveries] = useState<DeliveryOption[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(
    prefilledDeliveryId || ""
  );
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<GrnItemInput[]>([]);

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getDeliveriesForGrn();
        setDeliveries(data as unknown as DeliveryOption[]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load deliveries"
        );
      }
    });
  }, []);

  useEffect(() => {
    if (selectedDeliveryId) {
      const delivery = deliveries.find((d) => d.id === selectedDeliveryId);
      if (delivery) {
        const newItems: GrnItemInput[] = delivery.purchaseOrder.lineItems.map(
          (li) => {
            const remaining = li.quantity - li.deliveredQty;
            return {
              poLineItemId: li.id,
              productName: li.productName,
              sku: li.sku,
              uom: li.uom,
              orderedQty: li.quantity,
              previouslyReceived: li.deliveredQty,
              remainingQty: remaining,
              receivedQty: remaining > 0 ? remaining : 0,
              acceptedQty: remaining > 0 ? remaining : 0,
              rejectedQty: 0,
              rejectReason: "",
            };
          }
        );
        setItems(newItems);
      }
    } else {
      setItems([]);
    }
  }, [selectedDeliveryId, deliveries]);

  function updateItem(index: number, field: keyof GrnItemInput, value: number | string) {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === "receivedQty") {
        item.receivedQty = value as number;
        item.acceptedQty = (value as number) - item.rejectedQty;
        if (item.acceptedQty < 0) item.acceptedQty = 0;
      } else if (field === "rejectedQty") {
        item.rejectedQty = value as number;
        item.acceptedQty = item.receivedQty - (value as number);
        if (item.acceptedQty < 0) item.acceptedQty = 0;
      } else if (field === "acceptedQty") {
        item.acceptedQty = value as number;
        item.rejectedQty = item.receivedQty - (value as number);
        if (item.rejectedQty < 0) item.rejectedQty = 0;
      } else {
        (item as Record<string, unknown>)[field] = value;
      }

      updated[index] = item;
      return updated;
    });
  }

  async function handleSubmit() {
    if (!selectedDeliveryId) {
      toast.error("Please select a delivery");
      return;
    }

    if (items.length === 0) {
      toast.error("No items to submit");
      return;
    }

    try {
      await createGrn({
        deliveryId: selectedDeliveryId,
        receivedDate,
        remarks: remarks || undefined,
        items: items.map((item) => ({
          poLineItemId: item.poLineItemId,
          orderedQty: item.orderedQty,
          receivedQty: item.receivedQty,
          acceptedQty: item.acceptedQty,
          rejectedQty: item.rejectedQty,
          rejectReason: item.rejectReason || undefined,
        })),
      });
      toast.success("GRN created successfully");
      router.push("/grn");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create GRN");
    }
  }

  const selectedDelivery = deliveries.find(
    (d) => d.id === selectedDeliveryId
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create GRN"
        description="Record goods received against a delivery"
      >
        <Button
          variant="outline"
          render={<Link href="/grn" />}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </PageHeader>

      {/* Delivery Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Delivery *</Label>
              <Select
                value={selectedDeliveryId}
                onValueChange={(val) => setSelectedDeliveryId(val ?? "")}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select delivery" />
                </SelectTrigger>
                <SelectContent>
                  {deliveries.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.number} - {d.purchaseOrder.vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Received Date *</Label>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            {selectedDelivery && (
              <div>
                <Label className="text-muted-foreground">PO Number</Label>
                <p className="mt-2 text-sm font-medium">
                  {selectedDelivery.purchaseOrder.number}
                </p>
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Remarks</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional remarks..."
                className="mt-1.5"
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Line Items ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Prev Received</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Received Qty</TableHead>
                    <TableHead className="text-right">Accepted Qty</TableHead>
                    <TableHead className="text-right">Rejected Qty</TableHead>
                    <TableHead>Reject Reason</TableHead>
                    <TableHead className="text-right">Accept Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => {
                    const acceptRate =
                      item.receivedQty > 0
                        ? ((item.acceptedQty / item.receivedQty) * 100).toFixed(
                            1
                          )
                        : "0.0";
                    return (
                      <TableRow key={item.poLineItemId}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell className="text-right">
                          {item.orderedQty}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.previouslyReceived}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.remainingQty}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            value={item.receivedQty}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "receivedQty",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            value={item.acceptedQty}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "acceptedQty",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            value={item.rejectedQty}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "rejectedQty",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.rejectReason}
                            onChange={(e) =>
                              updateItem(index, "rejectReason", e.target.value)
                            }
                            placeholder="Reason..."
                            className="w-32"
                            disabled={item.rejectedQty === 0}
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {acceptRate}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={handleSubmit} disabled={isPending}>
                <Save className="mr-1.5 size-4" />
                Create GRN
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
