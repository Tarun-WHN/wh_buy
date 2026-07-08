"use client";

import * as React from "react";
import { useState, useEffect, useTransition, use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { InvoiceDeductionCard } from "@/components/invoice-deduction-card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { PAYMENT_MODES } from "@/lib/constants";
import {
  getInvoice,
  performThreeWayMatch,
  approveInvoice,
  rejectInvoice,
} from "@/actions/invoice.actions";
import { createPayment } from "@/actions/payment.actions";

// ============================================================
// TYPES
// ============================================================

interface InvoiceData {
  id: string;
  number: string;
  vendorInvoiceNo: string;
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  poMatchStatus: string | null;
  grnMatchStatus: string | null;
  matchRemarks: string | null;
  filePath: string | null;
  fileName: string | null;
  deductionAmount: number;
  deductionReason: string | null;
  createdAt: string;
  purchaseOrder: {
    id: string;
    number: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    vendor: {
      id: string;
      name: string;
      code: string;
      email: string;
      phone: string;
      contactPerson: string;
      gstNumber: string | null;
    };
    lineItems: {
      id: string;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      taxAmount: number;
      totalPrice: number;
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
    gstNumber: string | null;
  };
  payments: {
    id: string;
    amount: number;
    paymentDate: string;
    paymentMode: string;
    referenceNo: string | null;
    remarks: string | null;
  }[];
}

// ============================================================
// PAGE
// ============================================================

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isPending, startTransition] = useTransition();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function loadInvoice() {
    startTransition(async () => {
      try {
        const data = await getInvoice(id);
        setInvoice(data as unknown as InvoiceData);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load invoice"
        );
      }
    });
  }

  async function handleRunMatch() {
    try {
      const result = await performThreeWayMatch(id);
      toast.success(
        `3-Way Match complete: PO ${result.poMatchStatus}, GRN ${result.grnMatchStatus}`
      );
      loadInvoice();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to run 3-way match"
      );
    }
  }

  async function handleApprove() {
    try {
      await approveInvoice(id);
      toast.success("Invoice approved");
      loadInvoice();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve invoice"
      );
    }
  }

  async function handleReject() {
    if (!rejectReason) {
      toast.error("Please provide a rejection reason");
      return;
    }
    try {
      await rejectInvoice(id, rejectReason);
      toast.success("Invoice rejected");
      setRejectReason("");
      loadInvoice();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject invoice"
      );
    }
  }

  async function handleRecordPayment() {
    if (!paymentAmount || !paymentMode) {
      toast.error("Please fill in required payment fields");
      return;
    }
    try {
      await createPayment({
        invoiceId: id,
        amount: parseFloat(paymentAmount),
        paymentDate,
        paymentMode,
        referenceNo: paymentRef || undefined,
        remarks: paymentRemarks || undefined,
      });
      toast.success("Payment recorded");
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setPaymentRef("");
      setPaymentRemarks("");
      loadInvoice();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record payment"
      );
    }
  }

  if (!invoice && isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading Invoice...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Invoice not found
      </div>
    );
  }

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = invoice.totalAmount - totalPaid;

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.number}
        description={`Invoice from ${invoice.vendor.name}`}
      >
        <Button
          variant="outline"
          render={<Link href="/invoices" />}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </PageHeader>

      <InvoiceDeductionCard
        invoiceId={invoice.id}
        totalAmount={invoice.totalAmount}
        initialDeduction={invoice.deductionAmount}
        initialReason={invoice.deductionReason}
        initialFilePath={invoice.filePath}
        initialFileName={invoice.fileName}
      />

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={handleRunMatch} disabled={isPending}>
          <RefreshCw className="mr-1.5 size-4" />
          Run 3-Way Match
        </Button>
        {(invoice.status === "VERIFIED" ||
          invoice.poMatchStatus === "MATCHED") && (
          <Button onClick={handleApprove} disabled={isPending}>
            <CheckCircle className="mr-1.5 size-4" />
            Approve
          </Button>
        )}
        {invoice.status !== "REJECTED" && invoice.status !== "PAID" && (
          <Dialog>
            <DialogTrigger>
              <Button variant="destructive">
                <XCircle className="mr-1.5 size-4" />
                Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Invoice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Reason *</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter rejection reason..."
                    className="mt-1.5"
                  />
                </div>
                <Button onClick={handleReject} variant="destructive">
                  Confirm Reject
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {(invoice.status === "APPROVED" ||
          invoice.status === "PARTIALLY_PAID") && (
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogTrigger>
              <Button>
                <CreditCard className="mr-1.5 size-4" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Invoice</Label>
                  <p className="text-sm font-medium">{invoice.number}</p>
                  <p className="text-xs text-muted-foreground">
                    Outstanding: {formatCurrency(outstanding)}
                  </p>
                </div>
                <div>
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={outstanding.toFixed(2)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Payment Mode *</Label>
                  <Select value={paymentMode} onValueChange={(val) => setPaymentMode(val ?? "")}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PAYMENT_MODES).map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reference Number</Label>
                  <Input
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="Transaction/UTR reference"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Remarks</Label>
                  <Textarea
                    value={paymentRemarks}
                    onChange={(e) => setPaymentRemarks(e.target.value)}
                    placeholder="Optional remarks..."
                    className="mt-1.5"
                    rows={2}
                  />
                </div>
                <Button onClick={handleRecordPayment} className="w-full">
                  Record Payment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Status & Amounts Header */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Invoice Status</Label>
            <div className="mt-1">
              <StatusBadge status={invoice.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Total Amount</Label>
            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(invoice.totalAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Total Paid</Label>
            <p className="mt-1 text-lg font-semibold text-green-600">
              {formatCurrency(totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Label className="text-muted-foreground">Outstanding</Label>
            <p
              className={`mt-1 text-lg font-semibold ${
                outstanding > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {formatCurrency(outstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-muted-foreground">
                Vendor Invoice No
              </Label>
              <p className="mt-1 text-sm font-medium">
                {invoice.vendorInvoiceNo}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Invoice Date</Label>
              <p className="mt-1 text-sm font-medium">
                {formatDate(invoice.invoiceDate)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Due Date</Label>
              <p className="mt-1 text-sm font-medium">
                {invoice.dueDate ? formatDate(invoice.dueDate) : "-"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Subtotal</Label>
              <p className="mt-1 text-sm font-medium">
                {formatCurrency(invoice.subtotal)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Tax Amount</Label>
              <p className="mt-1 text-sm font-medium">
                {formatCurrency(invoice.taxAmount)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Purchase Order</Label>
              <p className="mt-1">
                <Link
                  href={`/purchase-orders/${invoice.purchaseOrder.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {invoice.purchaseOrder.number}
                </Link>
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Vendor</Label>
              <p className="mt-1 text-sm font-medium">
                {invoice.vendor.name} ({invoice.vendor.code})
              </p>
            </div>
            {invoice.vendor.gstNumber && (
              <div>
                <Label className="text-muted-foreground">GST Number</Label>
                <p className="mt-1 text-sm font-medium">
                  {invoice.vendor.gstNumber}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3-Way Match Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3-Way Match</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comparison</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    PO Amount
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.purchaseOrder.totalAmount)}
                  </TableCell>
                  <TableCell>
                    {invoice.poMatchStatus ? (
                      <StatusBadge status={invoice.poMatchStatus} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Not checked
                      </span>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    GRN Value
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    Run match to calculate
                  </TableCell>
                  <TableCell>
                    {invoice.grnMatchStatus ? (
                      <StatusBadge status={invoice.grnMatchStatus} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Not checked
                      </span>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    Invoice Amount
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.totalAmount)}
                  </TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {invoice.matchRemarks && (
            <div className="mt-4 rounded-lg border p-3">
              <Label className="text-muted-foreground">Match Remarks</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {invoice.matchRemarks}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Payments ({invoice.payments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No payments recorded yet.
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {formatDate(payment.paymentDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>{payment.paymentMode}</TableCell>
                      <TableCell>{payment.referenceNo || "-"}</TableCell>
                      <TableCell>{payment.remarks || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Invoice</span>
                <span>{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="text-green-600">
                  {formatCurrency(totalPaid)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>Outstanding</span>
                <span className={outstanding > 0 ? "text-red-600" : ""}>
                  {formatCurrency(outstanding)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
