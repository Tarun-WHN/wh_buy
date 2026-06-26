"use client";

import * as React from "react";
import { useState, useEffect, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  XCircle,
  BarChart3,
  Trash2,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { getRfq, publishRfq, closeRfq, deleteRfq } from "@/actions/rfq.actions";

// ============================================================
// TYPES
// ============================================================

interface RfqData {
  id: string;
  number: string;
  title: string;
  rfqType: string;
  status: string;
  submissionDeadline: string | null;
  termsConditions: string | null;
  deliveryLocation: string | null;
  createdAt: string;
  updatedAt: string;
  requirement: { id: string; number: string; title: string } | null;
  createdBy: { id: string; name: string };
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
    };
  }[];
  rfqVendors: {
    id: string;
    status: string;
    dispatchedAt: string | null;
    viewedAt: string | null;
    vendor: {
      id: string;
      name: string;
      code: string;
      email: string;
      phone: string;
      rating: number;
    };
  }[];
  quotations: {
    id: string;
    number: string;
    revision: number;
    status: string;
    totalAmount: number;
    submittedAt: string | null;
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

export default function RfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rfq, setRfq] = useState<RfqData | null>(null);

  useEffect(() => {
    loadRfq();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function loadRfq() {
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
  }

  async function handlePublish() {
    try {
      await publishRfq(id);
      toast.success("RFQ published and dispatched to vendors");
      loadRfq();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to publish RFQ"
      );
    }
  }

  async function handleClose() {
    try {
      await closeRfq(id);
      toast.success("RFQ closed");
      loadRfq();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to close RFQ"
      );
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this RFQ?")) return;
    try {
      await deleteRfq(id);
      toast.success("RFQ deleted");
      router.push("/rfq");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete RFQ"
      );
    }
  }

  if (!rfq && isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading RFQ...
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

  const isDraft = rfq.status === "DRAFT";
  const canClose =
    rfq.status !== "CLOSED" &&
    rfq.status !== "CANCELLED" &&
    rfq.status !== "DRAFT";
  const hasQuotations = rfq.quotations.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title={rfq.number} description={rfq.title}>
        <Button variant="outline" render={<Link href="/rfq" />}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </PageHeader>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {isDraft && (
          <>
            <Button onClick={handlePublish} disabled={isPending}>
              <Send className="mr-1.5 size-4" />
              Publish
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
        {canClose && (
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            <XCircle className="mr-1.5 size-4" />
            Close RFQ
          </Button>
        )}
        {hasQuotations && (
          <Button render={<Link href={`/rfq/${id}/compare`} />}>
            <BarChart3 className="mr-1.5 size-4" />
            Compare Quotes
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="lineitems">
            Line Items ({rfq.lineItems.length})
          </TabsTrigger>
          <TabsTrigger value="vendors">
            Vendors ({rfq.rfqVendors.length})
          </TabsTrigger>
          <TabsTrigger value="quotations">
            Quotations ({rfq.quotations.length})
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* DETAILS TAB */}
        {/* ============================================================ */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">RFQ Information</CardTitle>
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
                <div>
                  <Label className="text-muted-foreground">Created By</Label>
                  <p className="mt-1 text-sm font-medium">
                    {rfq.createdBy.name}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(rfq.createdAt)}
                  </p>
                </div>
                {rfq.submissionDeadline && (
                  <div>
                    <Label className="text-muted-foreground">
                      Submission Deadline
                    </Label>
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
                {rfq.requirement && (
                  <div>
                    <Label className="text-muted-foreground">
                      Linked Requirement
                    </Label>
                    <div className="mt-1">
                      <Link
                        href={`/requirements/${rfq.requirement.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {rfq.requirement.number} - {rfq.requirement.title}
                      </Link>
                    </div>
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
        </TabsContent>

        {/* ============================================================ */}
        {/* LINE ITEMS TAB */}
        {/* ============================================================ */}
        <TabsContent value="lineitems">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Line Items ({rfq.lineItems.length})
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
        </TabsContent>

        {/* ============================================================ */}
        {/* VENDORS TAB */}
        {/* ============================================================ */}
        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Vendors ({rfq.rfqVendors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dispatched</TableHead>
                      <TableHead>Viewed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfq.rfqVendors.map((rv) => (
                      <TableRow key={rv.id}>
                        <TableCell className="font-medium">
                          {rv.vendor.name}
                        </TableCell>
                        <TableCell>{rv.vendor.code}</TableCell>
                        <TableCell>{rv.vendor.email}</TableCell>
                        <TableCell>{rv.vendor.phone}</TableCell>
                        <TableCell>
                          {rv.vendor.rating > 0
                            ? `${rv.vendor.rating.toFixed(1)}/5`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={rv.status} />
                        </TableCell>
                        <TableCell>
                          {rv.dispatchedAt
                            ? formatDateTime(rv.dispatchedAt)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {rv.viewedAt ? formatDateTime(rv.viewedAt) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* QUOTATIONS TAB */}
        {/* ============================================================ */}
        <TabsContent value="quotations">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Quotations ({rfq.quotations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rfq.quotations.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No quotations received yet.
                </p>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quotation #</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Revision</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rfq.quotations.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell className="font-medium">
                            {q.number}
                          </TableCell>
                          <TableCell>
                            {q.vendor.name} ({q.vendor.code})
                          </TableCell>
                          <TableCell>Rev {q.revision}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(q.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={q.status} />
                          </TableCell>
                          <TableCell>
                            {q.submittedAt
                              ? formatDate(q.submittedAt)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              render={
                                <Link href={`/quotations/${q.id}`} />
                              }
                            >
                              View
                            </Button>
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
