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
import { VENDOR_REGISTRATION_STATUS } from "@/lib/constants";
import { getVendors, importVendorRows } from "@/actions/vendor.actions";
import { ImportButton } from "@/components/masters/import-button";

// ============================================================
// TYPES
// ============================================================

interface VendorRow {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  categories: string;
  rating: number;
  registrationStatus: string;
}

// ============================================================
// COLUMNS
// ============================================================

const columns: ColumnDef<VendorRow, unknown>[] = [
  {
    accessorKey: "code",
    header: SortableHeader("Code"),
    cell: ({ row }) => (
      <Link
        href={`/masters/vendors/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: SortableHeader("Name"),
  },
  {
    accessorKey: "contactPerson",
    header: "Contact Person",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "categories",
    header: "Categories",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.categories || "-"}
      </span>
    ),
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) =>
      row.original.rating > 0 ? `${row.original.rating.toFixed(1)}/5` : "-",
  },
  {
    accessorKey: "registrationStatus",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.registrationStatus} />
    ),
  },
];

// ============================================================
// PAGE
// ============================================================

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  function loadVendors() {
    startTransition(async () => {
      try {
        const result = await getVendors({
          search: search || undefined,
          status: statusFilter || undefined,
        });
        const rows: VendorRow[] = result.data.map((v) => ({
          id: v.id,
          code: v.code,
          name: v.name,
          contactPerson: v.contactPerson,
          email: v.email,
          categories: v.vendorCategories
            .map((vc) => vc.category.name)
            .join(", "),
          rating: v.rating,
          registrationStatus: v.registrationStatus,
        }));
        setVendors(rows);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load vendors"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Master"
        description="Manage your vendor directory"
      >
        <ImportButton
          templateName="vendors"
          headers={["Name", "Code", "ContactPerson", "Email", "Phone", "Address", "City", "State", "Pincode", "GSTNumber", "PANNumber", "PaymentTerms"]}
          sample={["Acme Traders", "ACME", "Ravi Kumar", "ravi@acme.com", "9876543210", "12 MG Road", "Bengaluru", "Karnataka", "560001", "29ABCDE1234F1Z5", "ABCDE1234F", "30 days"]}
          action={importVendorRows}
          onDone={() => loadVendors()}
        />
        <Button variant="brand" render={<Link href="/masters/vendors/new" />}>
          <Plus className="mr-1.5 size-4" />
          Add Vendor
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by name or email..."
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
                {Object.values(VENDOR_REGISTRATION_STATUS).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={vendors}
            searchKey="name"
            searchPlaceholder="Filter by name..."
            onRowClick={(row) => router.push(`/masters/vendors/${row.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
