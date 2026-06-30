"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Plus, Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortableHeader, type ColumnDef } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { searchDocuments, uploadDocument } from "@/actions/document.actions";

// ============================================================
// TYPES
// ============================================================

interface DocumentRow {
  id: string;
  name: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  entity: string;
  entityId: string;
  version: number;
  uploadedBy: string;
  createdAt: string;
}

// ============================================================
// HELPERS
// ============================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ENTITY_TYPES = ["VENDOR", "PO", "GRN", "INVOICE"] as const;

// ============================================================
// PAGE
// ============================================================

export default function DocumentsPage() {
  const [isPending, startTransition] = useTransition();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadEntity, setUploadEntity] = useState("");
  const [uploadEntityId, setUploadEntityId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, [search, entityFilter]);

  function loadData() {
    startTransition(async () => {
      try {
        const result = await searchDocuments({
          search: search || undefined,
          entity: entityFilter || undefined,
        });
        setDocuments(result.data as unknown as DocumentRow[]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load documents"
        );
      }
    });
  }

  function openUploadDialog() {
    setUploadName("");
    setUploadEntity("");
    setUploadEntityId("");
    setUploadFile(null);
    setUploadDialogOpen(true);
  }

  async function handleUpload() {
    if (!uploadName || !uploadEntity || !uploadEntityId || !uploadFile) {
      toast.error("Please fill in all required fields and select a file");
      return;
    }

    setUploading(true);
    try {
      // In a real app, the file would be uploaded to storage first.
      // Here we create the document record with the file metadata.
      const filePath = `/uploads/${Date.now()}-${uploadFile.name}`;

      await uploadDocument({
        name: uploadName,
        filePath,
        fileSize: uploadFile.size,
        mimeType: uploadFile.type || "application/octet-stream",
        entity: uploadEntity,
        entityId: uploadEntityId,
      });

      toast.success("Document uploaded successfully");
      setUploadDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload document"
      );
    } finally {
      setUploading(false);
    }
  }

  // ============================================================
  // COLUMNS
  // ============================================================

  const columns: ColumnDef<DocumentRow, unknown>[] = [
    {
      accessorKey: "name",
      header: SortableHeader("Name"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "entity",
      header: "Entity Type",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.entity}</Badge>
      ),
    },
    {
      accessorKey: "entityId",
      header: "Entity ID",
      cell: ({ row }) => (
        <span className="text-xs font-mono">{row.original.entityId}</span>
      ),
    },
    {
      accessorKey: "fileSize",
      header: SortableHeader("File Size"),
      cell: ({ row }) => formatFileSize(row.original.fileSize),
    },
    {
      accessorKey: "uploadedBy",
      header: "Uploaded By",
      cell: ({ row }) => (
        <span className="text-xs">{row.original.uploadedBy}</span>
      ),
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => `v${row.original.version}`,
    },
    {
      accessorKey: "createdAt",
      header: SortableHeader("Date"),
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <a href={row.original.filePath} download>
          <Button variant="ghost" size="icon-sm">
            <Download className="size-4" />
          </Button>
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Management"
        description="Upload and manage documents"
      >
        <Button variant="brand" onClick={openUploadDialog}>
          <Plus className="mr-2 size-4" />
          Upload Document
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={entityFilter || "all"} onValueChange={(v: string | null) => setEntityFilter(!v || v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Entity Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entity Types</SelectItem>
            {ENTITY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={documents} />

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Name *</Label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g. Invoice Copy"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Entity Type *</Label>
              <Select value={uploadEntity} onValueChange={(v: string | null) => setUploadEntity(v ?? "")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Entity ID *</Label>
              <Input
                value={uploadEntityId}
                onChange={(e) => setUploadEntityId(e.target.value)}
                placeholder="Reference ID"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>File *</Label>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="mt-1.5"
              />
            </div>
            <Button onClick={handleUpload} className="w-full" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
