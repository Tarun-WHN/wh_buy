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
import { formatDate } from "@/lib/utils";
import { GRN_STATUS } from "@/lib/constants";
import { getGrns } from "@/actions/grn.actions";

// ============================================================
// TYPES
// ============================================================

interface GrnRow {
  id: string;
  number: string;
  deliveryNumber: string;
  deliveryId: string;
  poNumber: string;
  poId: string;
  status: string;
  receivedDate: string;
}

// ============================================================
// COLUMNS
// ============================================================

const columns: ColumnDef<GrnRow, unknown>[] = [
  {
    accessorKey: "number",
    header: SortableHeader("GRN Number"),
    cell: ({ row }) => (
      <Link
        href={`/grn/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  {
    accessorKey: "deliveryNumber",
    header: SortableHeader("Delivery Number"),
    cell: ({ row }) => (
      <Link
        href={`/delivery/${row.original.deliveryId}`}
        className="text-primary hover:underline"
      >
        {row.original.deliveryNumber}
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "receivedDate",
    header: SortableHeader("Received Date"),
    cell: ({ row }) => formatDate(row.original.receivedDate),
  },
];

// ============================================================
// PAGE
// ============================================================

export default function GrnListPage() {
  const [grns, setGrns] = useState<GrnRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    loadGrns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  function loadGrns() {
    startTransition(async () => {
      try {
        const result = await getGrns({
          search: search || undefined,
          status: statusFilter || undefined,
        });
        const rows: GrnRow[] = result.data.map((g) => ({
          id: g.id,
          number: g.number,
          deliveryNumber: g.delivery.number,
          deliveryId: g.delivery.id,
          poNumber: g.delivery.purchaseOrder.number,
          poId: g.delivery.purchaseOrder.id,
          status: g.status,
          receivedDate: g.receivedDate as unknown as string,
        }));
        setGrns(rows);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load GRNs"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipt Notes"
        description="Manage goods received against deliveries"
      >
        <Button variant="brand" render={<Link href="/grn/new" />}>
          <Plus className="mr-1.5 size-4" />
          New GRN
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by GRN number..."
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
                {Object.values(GRN_STATUS).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={grns}
            searchKey="deliveryNumber"
            searchPlaceholder="Filter by delivery..."
            onRowClick={(row) => router.push(`/grn/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
