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
import { REQUIREMENT_STATUS, PRIORITY } from "@/lib/constants";
import { getRequirements } from "@/actions/requirement.actions";

// ============================================================
// TYPES
// ============================================================

interface RequirementRow {
  id: string;
  number: string;
  title: string;
  warehouseName: string;
  priority: string;
  status: string;
  itemsCount: number;
  createdAt: string;
  createdByName: string;
}

// ============================================================
// COLUMNS
// ============================================================

const columns: ColumnDef<RequirementRow, unknown>[] = [
  {
    accessorKey: "number",
    header: SortableHeader("Number"),
    cell: ({ row }) => (
      <Link
        href={`/requirements/${row.original.id}`}
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
    accessorKey: "warehouseName",
    header: "Warehouse",
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => <StatusBadge status={row.original.priority} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "itemsCount",
    header: "Items",
  },
  {
    accessorKey: "createdByName",
    header: "Created By",
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

export default function RequirementsPage() {
  const router = useRouter();
  const [requirements, setRequirements] = useState<RequirementRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadRequirements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, priorityFilter]);

  function loadRequirements() {
    startTransition(async () => {
      try {
        const result = await getRequirements({
          search: search || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
        });
        const rows: RequirementRow[] = result.data.map((r) => ({
          id: r.id,
          number: r.number,
          title: r.title,
          warehouseName: r.warehouse.name,
          priority: r.priority,
          status: r.status,
          itemsCount: r._count.items,
          createdAt: r.createdAt as unknown as string,
          createdByName: r.createdBy.name,
        }));
        setRequirements(rows);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load requirements"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requirements"
        description="Manage procurement requirements"
      >
        <Button variant="brand" render={<Link href="/requirements/new" />}>
          <Plus className="mr-1.5 size-4" />
          New Requirement
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
                {Object.values(REQUIREMENT_STATUS).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter}
              onValueChange={(val) =>
                setPriorityFilter(!val || val === "__all__" ? "" : val)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Priorities</SelectItem>
                {Object.values(PRIORITY).map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={requirements}
            searchKey="title"
            searchPlaceholder="Filter by title..."
            onRowClick={(row) => router.push(`/requirements/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
