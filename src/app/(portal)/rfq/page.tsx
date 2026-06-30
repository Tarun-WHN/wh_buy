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
import { RFQ_STATUS } from "@/lib/constants";
import { getRfqs } from "@/actions/rfq.actions";

// ============================================================
// TYPES
// ============================================================

interface RfqRow {
  id: string;
  number: string;
  title: string;
  rfqType: string;
  status: string;
  itemsCount: number;
  vendorsCount: number;
  quotationsCount: number;
  createdAt: string;
}

// ============================================================
// COLUMNS
// ============================================================

const columns: ColumnDef<RfqRow, unknown>[] = [
  {
    accessorKey: "number",
    header: SortableHeader("RFQ Number"),
    cell: ({ row }) => (
      <Link
        href={`/rfq/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.number}
      </Link>
    ),
  },
  {
    accessorKey: "title",
    header: SortableHeader("Title"),
  },
  {
    accessorKey: "rfqType",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-xs font-medium uppercase">{row.original.rfqType}</span>
    ),
  },
  {
    accessorKey: "itemsCount",
    header: "Items",
  },
  {
    accessorKey: "vendorsCount",
    header: "Vendors",
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

export default function RfqListPage() {
  const router = useRouter();
  const [rfqs, setRfqs] = useState<RfqRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadRfqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  function loadRfqs() {
    startTransition(async () => {
      try {
        const result = await getRfqs({
          search: search || undefined,
          status: statusFilter || undefined,
        });
        const rows: RfqRow[] = result.data.map((r) => ({
          id: r.id,
          number: r.number,
          title: r.title,
          rfqType: r.rfqType,
          status: r.status,
          itemsCount: r._count.lineItems,
          vendorsCount: r._count.rfqVendors,
          quotationsCount: r._count.quotations,
          createdAt: r.createdAt as unknown as string,
        }));
        setRfqs(rows);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load RFQs"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="RFQs"
        description="Manage requests for quotation"
      >
        <Button variant="brand" render={<Link href="/rfq/new" />}>
          <Plus className="mr-1.5 size-4" />
          New RFQ
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by title or number..."
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
                {Object.values(RFQ_STATUS).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={rfqs}
            searchKey="title"
            searchPlaceholder="Filter by title..."
            onRowClick={(row) => router.push(`/rfq/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
