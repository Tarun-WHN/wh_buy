"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { getPosForInvoice, createInvoice } from "@/actions/invoice.actions";

// ============================================================
// TYPES
// ============================================================

interface PoOption {
  id: string;
  number: string;
  vendorId: string;
  vendor: { id: string; name: string; code: string };
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

// ============================================================
// PAGE
// ============================================================

export default function CreateInvoicePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pos, setPos] = useState<PoOption[]>([]);
  const [selectedPoId, setSelectedPoId] = useState("");
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getPosForInvoice();
        setPos(data as unknown as PoOption[]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load POs"
        );
      }
    });
  }, []);

  const selectedPo = pos.find((p) => p.id === selectedPoId);

  useEffect(() => {
    if (selectedPo) {
      setSubtotal(selectedPo.subtotal.toFixed(2));
      setTaxAmount(selectedPo.taxAmount.toFixed(2));
      setTotalAmount(selectedPo.totalAmount.toFixed(2));
    }
  }, [selectedPo]);

  // Auto-calculate total when subtotal or tax changes
  useEffect(() => {
    const sub = parseFloat(subtotal) || 0;
    const tax = parseFloat(taxAmount) || 0;
    setTotalAmount((sub + tax).toFixed(2));
  }, [subtotal, taxAmount]);

  async function handleSubmit() {
    if (!selectedPoId) {
      toast.error("Please select a Purchase Order");
      return;
    }
    if (!vendorInvoiceNo) {
      toast.error("Please enter vendor invoice number");
      return;
    }

    try {
      await createInvoice({
        purchaseOrderId: selectedPoId,
        vendorInvoiceNo,
        invoiceDate,
        dueDate: dueDate || undefined,
        subtotal: parseFloat(subtotal) || 0,
        taxAmount: parseFloat(taxAmount) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
      });
      toast.success("Invoice created and 3-way match performed");
      router.push("/invoices");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create invoice"
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Invoice"
        description="Record a vendor invoice against a purchase order"
      >
        <Button
          variant="outline"
          render={<Link href="/invoices" />}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </PageHeader>

      {/* PO Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Purchase Order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Purchase Order *</Label>
              <Select value={selectedPoId} onValueChange={(val) => setSelectedPoId(val ?? "")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select PO">
                    {(value) => {
                      const po = pos.find((p) => p.id === value);
                      return po ? `${po.number} - ${po.vendor.name}` : "Select PO";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {pos.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.number} - {po.vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPo && (
              <>
                <div>
                  <Label className="text-muted-foreground">Vendor</Label>
                  <p className="mt-2 text-sm font-medium">
                    {selectedPo.vendor.name} ({selectedPo.vendor.code})
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">PO Amount</Label>
                  <p className="mt-2 text-sm font-medium">
                    {formatCurrency(selectedPo.totalAmount)}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Vendor Invoice Number *</Label>
              <Input
                value={vendorInvoiceNo}
                onChange={(e) => setVendorInvoiceNo(e.target.value)}
                placeholder="e.g., INV-12345"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Invoice Date *</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amounts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Amounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Subtotal *</Label>
              <Input
                type="number"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                placeholder="0.00"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Tax Amount</Label>
              <Input
                type="number"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Total Amount</Label>
              <Input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1.5"
                readOnly
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit} disabled={isPending}>
              <Save className="mr-1.5 size-4" />
              Create Invoice
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
