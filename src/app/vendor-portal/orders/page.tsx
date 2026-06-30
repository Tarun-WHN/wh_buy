"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, SortableHeader, type ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getVendorOrders } from "./actions";

// ============================================================
// TYPES
// ============================================================

interface VendorPoRow {
  id: string;
  number: string;
  warehouseName: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

// ============================================================
// COLUMNS
// ============================================================

const columns: ColumnDef<VendorPoRow, unknown>[] = [
  {
    accessorKey: "number",
    header: SortableHeader("PO Number"),
    cell: ({ row }) => (
      <Link
        href={`/vendor-portal/orders/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  {
    accessorKey: "warehouseName",
    header: "Warehouse",
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: SortableHeader("Date"),
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

// ============================================================
// PAGE
// ============================================================

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<VendorPoRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getVendorOrders();
        setOrders(data as unknown as VendorPoRow[]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load orders"
        );
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Orders placed to your company"
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={orders}
            searchKey="number"
            searchPlaceholder="Search by PO number..."
            onRowClick={(row) => router.push(`/vendor-portal/orders/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
