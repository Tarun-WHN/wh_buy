"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, SortableHeader, type ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatCurrency } from "@/lib/utils";
import { INVOICE_STATUS } from "@/lib/constants";
import { getInvoices } from "@/actions/invoice.actions";

// ============================================================
// TYPES
// ============================================================

interface InvoiceRow {
  id: string;
  number: string;
  vendorInvoiceNo: string;
  poNumber: string;
  poId: string;
  vendorName: string;
  totalAmount: number;
  poMatchStatus: string | null;
  grnMatchStatus: string | null;
  status: string;
  invoiceDate: string;
}

// ============================================================
// COLUMNS
// ============================================================

const columns: ColumnDef<InvoiceRow, unknown>[] = [
  {
    accessorKey: "number",
    header: SortableHeader("Invoice Number"),
    cell: ({ row }) => (
      <Link
        href={`/invoices/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  {
    accessorKey: "vendorInvoiceNo",
    header: SortableHeader("Vendor Invoice"),
  },
  {
    accessorKey: "poNumber",
    header: SortableHeader("PO Number"),
    cell: ({ row }) => (
      <Link
        href={`/purchase-orders/${row.original.poId}`}
        className="text-primary hover:underline"
      >
        {row.original.poNumber}
      </Link>
    ),
  },
  {
    accessorKey: "vendorName",
    header: SortableHeader("Vendor"),
  },
  {
    accessorKey: "totalAmount",
    header: SortableHeader("Amount"),
    cell: ({ row }) => (
      <span className="font-medium">
        {formatCurrency(row.original.totalAmount)}
      </span>
    ),
  },
  {
    accessorKey: "poMatchStatus",
    header: "Match Status",
    cell: ({ row }) =>
      row.original.poMatchStatus ? (
        <StatusBadge status={row.original.poMatchStatus} />
      ) : (
        <span className="text-xs text-muted-foreground">Pending</span>
      ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "invoiceDate",
    header: SortableHeader("Date"),
    cell: ({ row }) => formatDate(row.original.invoiceDate),
  },
];

// ============================================================
// PAGE
// ============================================================

export default function InvoiceListPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  function loadInvoices() {
    startTransition(async () => {
      try {
        const result = await getInvoices({
          search: search || undefined,
          status: statusFilter || undefined,
        });
        const rows: InvoiceRow[] = result.data.map((inv) => ({
          id: inv.id,
          number: inv.number,
          vendorInvoiceNo: inv.vendorInvoiceNo,
          poNumber: inv.purchaseOrder.number,
          poId: inv.purchaseOrder.id,
          vendorName: inv.vendor.name,
          totalAmount: inv.totalAmount,
          poMatchStatus: inv.poMatchStatus,
          grnMatchStatus: inv.grnMatchStatus,
          status: inv.status,
          invoiceDate: inv.invoiceDate as unknown as string,
        }));
        setInvoices(rows);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load invoices"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage vendor invoices and 3-way matching"
      >
        <Button variant="brand" render={<Link href="/invoices/new" />}>
          <Plus className="mr-1.5 size-4" />
          New Invoice
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by invoice number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select
              value={statusFilter}
              onValueChange={(val) =>
                setStatusFilter(!val || val === "__all__" ? "" : val)
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                {Object.values(INVOICE_STATUS).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={invoices}
            searchKey="vendorName"
            searchPlaceholder="Filter by vendor..."
            onRowClick={(row) => router.push(`/invoices/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
