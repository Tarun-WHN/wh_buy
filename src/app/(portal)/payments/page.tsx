"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CreditCard, AlertTriangle, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, SortableHeader, type ColumnDef } from "@/components/ui/data-table";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PAYMENT_MODES } from "@/lib/constants";
import {
  getPayments,
  getPaymentSummary,
  getAgingReport,
  getPendingInvoicesForPayment,
  createPayment,
} from "@/actions/payment.actions";

// ============================================================
// TYPES
// ============================================================

interface PaymentRow {
  id: string;
  invoiceNumber: string;
  invoiceId: string;
  vendorName: string;
  poNumber: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  referenceNo: string | null;
}

interface PendingInvoice {
  id: string;
  number: string;
  vendorInvoiceNo: string;
  totalAmount: number;
  totalPaid: number;
  outstanding: number;
  dueDate: string | null;
  invoiceDate: string;
  vendor: { id: string; name: string };
  purchaseOrder: { id: string; number: string };
}

interface AgingBucket {
  count: number;
  total: number;
}

// ============================================================
// PAYMENT HISTORY COLUMNS
// ============================================================

const paymentColumns: ColumnDef<PaymentRow, unknown>[] = [
  {
    accessorKey: "paymentDate",
    header: SortableHeader("Date"),
    cell: ({ row }) => formatDate(row.original.paymentDate),
  },
  {
    accessorKey: "invoiceNumber",
    header: SortableHeader("Invoice"),
    cell: ({ row }) => (
      <Link
        href={`/invoices/${row.original.invoiceId}`}
        className="text-primary hover:underline"
      >
        {row.original.invoiceNumber}
      </Link>
    ),
  },
  {
    accessorKey: "vendorName",
    header: SortableHeader("Vendor"),
  },
  {
    accessorKey: "amount",
    header: SortableHeader("Amount"),
    cell: ({ row }) => (
      <span className="font-medium">
        {formatCurrency(row.original.amount)}
      </span>
    ),
  },
  {
    accessorKey: "paymentMode",
    header: "Mode",
  },
  {
    accessorKey: "referenceNo",
    header: "Reference",
    cell: ({ row }) => row.original.referenceNo || "-",
  },
];

// ============================================================
// PAGE
// ============================================================

export default function PaymentsPage() {
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState({
    totalOutstanding: 0,
    totalPaidThisMonth: 0,
    totalOverdue: 0,
  });
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [agingReport, setAgingReport] = useState<
    Record<string, AgingBucket>
  >({});

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] =
    useState<PendingInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    startTransition(async () => {
      try {
        const [summaryData, paymentsData, pendingData, agingData] =
          await Promise.all([
            getPaymentSummary(),
            getPayments(),
            getPendingInvoicesForPayment(),
            getAgingReport(),
          ]);

        setSummary(summaryData);

        const rows: PaymentRow[] = paymentsData.data.map((p) => ({
          id: p.id,
          invoiceNumber: p.invoice.number,
          invoiceId: p.invoice.id,
          vendorName: p.invoice.vendor.name,
          poNumber: p.invoice.purchaseOrder.number,
          amount: p.amount,
          paymentDate: p.paymentDate as unknown as string,
          paymentMode: p.paymentMode,
          referenceNo: p.referenceNo,
        }));
        setPayments(rows);
        setPendingInvoices(pendingData as unknown as PendingInvoice[]);

        // Strip invoices from aging for the summary table
        const agingSummary: Record<string, AgingBucket> = {};
        for (const [key, val] of Object.entries(agingData)) {
          agingSummary[key] = {
            count: (val as AgingBucket).count,
            total: (val as AgingBucket).total,
          };
        }
        setAgingReport(agingSummary);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load payment data"
        );
      }
    });
  }

  function openPaymentDialog(invoice: PendingInvoice) {
    setSelectedInvoice(invoice);
    setPaymentAmount(invoice.outstanding.toFixed(2));
    setPaymentDialogOpen(true);
  }

  async function handleRecordPayment() {
    if (!selectedInvoice || !paymentAmount || !paymentMode) {
      toast.error("Please fill in required fields");
      return;
    }
    try {
      await createPayment({
        invoiceId: selectedInvoice.id,
        amount: parseFloat(paymentAmount),
        paymentDate,
        paymentMode,
        referenceNo: paymentRef || undefined,
        remarks: paymentRemarks || undefined,
      });
      toast.success("Payment recorded");
      setPaymentDialogOpen(false);
      setSelectedInvoice(null);
      setPaymentAmount("");
      setPaymentRef("");
      setPaymentRemarks("");
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record payment"
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track payments and outstanding invoices"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Total Outstanding
                </Label>
                <p className="text-lg font-semibold">
                  {formatCurrency(summary.totalOutstanding)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <Label className="text-muted-foreground">
                  Paid This Month
                </Label>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(summary.totalPaidThisMonth)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <Label className="text-muted-foreground">Overdue Amount</Label>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(summary.totalOverdue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Payments ({pendingInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* PENDING PAYMENTS TAB */}
        {/* ============================================================ */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Invoices with Outstanding Amounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingInvoices.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No pending payments.
                </p>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>PO</TableHead>
                        <TableHead className="text-right">
                          Total Amount
                        </TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">
                          Outstanding
                        </TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInvoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>
                            <Link
                              href={`/invoices/${inv.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {inv.number}
                            </Link>
                          </TableCell>
                          <TableCell>{inv.vendor.name}</TableCell>
                          <TableCell>
                            <Link
                              href={`/purchase-orders/${inv.purchaseOrder.id}`}
                              className="text-primary hover:underline"
                            >
                              {inv.purchaseOrder.number}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(inv.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(inv.totalPaid)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            {formatCurrency(inv.outstanding)}
                          </TableCell>
                          <TableCell>
                            {inv.dueDate
                              ? formatDate(inv.dueDate)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => openPaymentDialog(inv)}
                            >
                              Record Payment
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

        {/* ============================================================ */}
        {/* PAYMENT HISTORY TAB */}
        {/* ============================================================ */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={paymentColumns}
                data={payments}
                searchKey="vendorName"
                searchPlaceholder="Filter by vendor..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* AGING REPORT TAB */}
        {/* ============================================================ */}
        <TabsContent value="aging">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Aging Report - Outstanding Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aging Bucket</TableHead>
                      <TableHead className="text-right">
                        No. of Invoices
                      </TableHead>
                      <TableHead className="text-right">
                        Total Amount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(agingReport).map(([bucket, data]) => (
                      <TableRow key={bucket}>
                        <TableCell className="font-medium">
                          {bucket} days
                        </TableCell>
                        <TableCell className="text-right">
                          {data.count}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(data.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">
                        {Object.values(agingReport).reduce(
                          (sum, d) => sum + d.count,
                          0
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          Object.values(agingReport).reduce(
                            (sum, d) => sum + d.total,
                            0
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Invoice</Label>
                <p className="text-sm font-medium">
                  {selectedInvoice.number} ({selectedInvoice.vendor.name})
                </p>
                <p className="text-xs text-muted-foreground">
                  Outstanding: {formatCurrency(selectedInvoice.outstanding)}
                </p>
              </div>
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
