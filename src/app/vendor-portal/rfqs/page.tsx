"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, SortableHeader, type ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { getVendorRfqs } from "./actions";

// ============================================================
// TYPES
// ============================================================

interface VendorRfqRow {
  id: string;
  rfqId: string;
  rfqNumber: string;
  rfqTitle: string;
  itemCount: number;
  deadline: string | null;
  status: string;
}

// ============================================================
// COLUMNS
// ============================================================

const columns: ColumnDef<VendorRfqRow, unknown>[] = [
  {
    accessorKey: "rfqNumber",
    header: SortableHeader("RFQ Number"),
    cell: ({ row }) => (
      <Link
        href={`/vendor-portal/rfqs/${row.original.rfqId}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.rfqNumber}
      </Link>
    ),
  },
  {
    accessorKey: "rfqTitle",
    header: SortableHeader("Title"),
  },
  {
    accessorKey: "itemCount",
    header: "Items",
  },
  {
    accessorKey: "deadline",
    header: SortableHeader("Deadline"),
    cell: ({ row }) =>
      row.original.deadline ? formatDate(row.original.deadline) : "-",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => (
      <Button
        size="sm"
        variant="outline"
        render={<Link href={`/vendor-portal/rfqs/${row.original.rfqId}`} />}
      >
        {row.original.status === "DISPATCHED" ? "Submit Quote" : "View"}
      </Button>
    ),
  },
];

// ============================================================
// PAGE
// ============================================================

export default function VendorRfqListPage() {
  const [rfqs, setRfqs] = useState<VendorRfqRow[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getVendorRfqs();
        setRfqs(data as unknown as VendorRfqRow[]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load RFQs"
        );
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="RFQs"
        description="Request for quotations assigned to you"
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={rfqs}
            searchKey="rfqTitle"
            searchPlaceholder="Search by title..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
