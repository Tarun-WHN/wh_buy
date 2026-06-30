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
import { PO_STATUS } from "@/lib/constants";
import { getPurchaseOrders } from "@/actions/po.actions";

// ============================================================
// TYPES
// ============================================================

interface PoRow {
  id: string;
  number: string;
  vendorName: string;
  warehouseName: string;
  totalAmount: number;
  status: string;
  revision: number;
  createdAt: string;
}

// ============================================================
// COLUMNS
// ============================================================

const columns: ColumnDef<PoRow, unknown>[] = [
  {
    accessorKey: "number",
    header: SortableHeader("PO Number"),
    cell: ({ row }) => (
      <Link
        href={`/purchase-orders/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  {
    accessorKey: "vendorName",
    header: SortableHeader("Vendor"),
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
    accessorKey: "revision",
    header: "Rev",
    cell: ({ row }) => <span className="text-xs">v{row.original.revision}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: SortableHeader("Created"),
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

// ============================================================
// PAGE
// ============================================================

export default function PurchaseOrderListPage() {
  const router = useRouter();
  const [pos, setPos] = useState<PoRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadPos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  function loadPos() {
    startTransition(async () => {
      try {
        const result = await getPurchaseOrders({
          search: search || undefined,
          status: statusFilter || undefined,
        });
        const rows: PoRow[] = result.data.map((po) => ({
          id: po.id,
          number: po.number,
          vendorName: po.vendor.name,
          warehouseName: po.warehouse.name,
          totalAmount: po.totalAmount,
          status: po.status,
          revision: po.revision,
          createdAt: po.createdAt as unknown as string,
        }));
        setPos(rows);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load Purchase Orders"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Manage purchase orders"
      >
        <Button variant="brand" render={<Link href="/purchase-orders/new" />}>
          <Plus className="mr-1.5 size-4" />
          New PO
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by PO number..."
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
                {Object.values(PO_STATUS).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={pos}
            searchKey="vendorName"
            searchPlaceholder="Filter by vendor..."
            onRowClick={(row) => router.push(`/purchase-orders/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
