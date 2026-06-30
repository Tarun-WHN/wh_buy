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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { DELIVERY_STATUS } from "@/lib/constants";
import { getDeliveries } from "@/actions/delivery.actions";

// ============================================================
// TYPES
// ============================================================

interface DeliveryRow {
  id: string;
  number: string;
  poNumber: string;
  poId: string;
  vendorName: string;
  status: string;
  dispatchDate: string | null;
  expectedDate: string | null;
  deliveredDate: string | null;
}

// ============================================================
// COLUMNS
// ============================================================

const columns: ColumnDef<DeliveryRow, unknown>[] = [
  {
    accessorKey: "number",
    header: SortableHeader("Delivery Number"),
    cell: ({ row }) => (
      <Link
        href={`/delivery/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.number}
      </Link>
    ),
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "dispatchDate",
    header: SortableHeader("Dispatch Date"),
    cell: ({ row }) =>
      row.original.dispatchDate
        ? formatDate(row.original.dispatchDate)
        : "-",
  },
  {
    accessorKey: "expectedDate",
    header: SortableHeader("Expected Date"),
    cell: ({ row }) =>
      row.original.expectedDate
        ? formatDate(row.original.expectedDate)
        : "-",
  },
  {
    accessorKey: "deliveredDate",
    header: "Delivered Date",
    cell: ({ row }) =>
      row.original.deliveredDate
        ? formatDate(row.original.deliveredDate)
        : "-",
  },
];

// ============================================================
// PAGE
// ============================================================

export default function DeliveryListPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    loadDeliveries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  function loadDeliveries() {
    startTransition(async () => {
      try {
        const result = await getDeliveries({
          search: search || undefined,
          status: statusFilter || undefined,
        });
        const rows: DeliveryRow[] = result.data.map((d) => ({
          id: d.id,
          number: d.number,
          poNumber: d.purchaseOrder.number,
          poId: d.purchaseOrder.id,
          vendorName: d.vendor.name,
          status: d.status,
          dispatchDate: d.dispatchDate as unknown as string | null,
          expectedDate: d.expectedDate as unknown as string | null,
          deliveredDate: d.deliveredDate as unknown as string | null,
        }));
        setDeliveries(rows);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load deliveries"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliveries"
        description="Track deliveries against purchase orders"
      />

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by delivery number..."
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
                {Object.values(DELIVERY_STATUS).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={deliveries}
            searchKey="vendorName"
            searchPlaceholder="Filter by vendor..."
            onRowClick={(row) => router.push(`/delivery/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
