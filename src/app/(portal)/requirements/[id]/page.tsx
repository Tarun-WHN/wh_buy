"use client";

import * as React from "react";
import { useState, useEffect, useTransition, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Send,
  Edit,
  FileText,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  getRequirement,
  submitRequirement,
  approveRequirement,
  rejectRequirement,
  deleteRequirement,
} from "@/actions/requirement.actions";

// ============================================================
// TYPES
// ============================================================

interface RequirementData {
  id: string;
  number: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  requiredDate: string | null;
  createdAt: string;
  updatedAt: string;
  warehouse: { id: string; name: string; code: string };
  createdBy: { id: string; name: string };
  items: {
    id: string;
    quantity: number;
    specifications: string | null;
    remarks: string | null;
    product: {
      id: string;
      name: string;
      sku: string;
      uom: string;
    };
  }[];
  rfqs: {
    id: string;
    number: string;
    status: string;
  }[];
}

// ============================================================
// PAGE
// ============================================================

export default function RequirementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requirement, setRequirement] = useState<RequirementData | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadRequirement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function loadRequirement() {
    startTransition(async () => {
      try {
        const data = await getRequirement(id);
        setRequirement(data as unknown as RequirementData);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load requirement"
        );
      }
    });
  }

  async function handleSubmit() {
    try {
      await submitRequirement(id);
      toast.success("Requirement submitted for approval");
      loadRequirement();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit requirement"
      );
    }
  }

  async function handleApprove() {
    try {
      await approveRequirement(id);
      toast.success("Requirement approved");
      loadRequirement();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve requirement"
      );
    }
  }

  async function handleReject() {
    try {
      await rejectRequirement(id, rejectReason);
      toast.success("Requirement rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
      loadRequirement();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject requirement"
      );
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this requirement?")) return;
    try {
      await deleteRequirement(id);
      toast.success("Requirement deleted");
      router.push("/requirements");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete requirement"
      );
    }
  }

  if (!requirement && isPending) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Loading requirement...
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Requirement not found
      </div>
    );
  }

  const isDraft = requirement.status === "DRAFT";
  const isSubmitted = requirement.status === "SUBMITTED";
  const isApproved = requirement.status === "APPROVED";

  return (
    <div className="space-y-6">
      <PageHeader
        title={requirement.number}
        description={requirement.title}
      >
        <Button variant="outline" render={<Link href="/requirements" />}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
      </PageHeader>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {isDraft && (
          <>
            <Button variant="outline" render={<Link href={`/requirements/new?edit=${id}`} />}>
              <Edit className="mr-1.5 size-4" />
              Edit
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              <Send className="mr-1.5 size-4" />
              Submit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="mr-1.5 size-4" />
              Delete
            </Button>
          </>
        )}
        {isSubmitted && (
          <>
            <Button onClick={handleApprove} disabled={isPending}>
              <CheckCircle className="mr-1.5 size-4" />
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => setRejectDialogOpen(true)}
              disabled={isPending}
            >
              <XCircle className="mr-1.5 size-4" />
              Reject
            </Button>
          </>
        )}
        {isApproved && (
          <Button render={<Link href={`/rfq/new?requirementId=${id}`} />}>
            <FileText className="mr-1.5 size-4" />
            Create RFQ
          </Button>
        )}
      </div>

      {/* Requirement Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requirement Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">
                <StatusBadge status={requirement.status} />
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Priority</Label>
              <div className="mt-1">
                <StatusBadge status={requirement.priority} />
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Warehouse</Label>
              <p className="mt-1 text-sm font-medium">
                {requirement.warehouse.name} ({requirement.warehouse.code})
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Created By</Label>
              <p className="mt-1 text-sm font-medium">
                {requirement.createdBy.name}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Created At</Label>
              <p className="mt-1 text-sm font-medium">
                {formatDateTime(requirement.createdAt)}
              </p>
            </div>
            {requirement.requiredDate && (
              <div>
                <Label className="text-muted-foreground">Required Date</Label>
                <p className="mt-1 text-sm font-medium">
                  {formatDate(requirement.requiredDate)}
                </p>
              </div>
            )}
            {requirement.description && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {requirement.description}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Line Items ({requirement.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Specifications</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirement.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {item.product.name}
                    </TableCell>
                    <TableCell>{item.product.sku}</TableCell>
                    <TableCell>{item.product.uom}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.specifications || "-"}</TableCell>
                    <TableCell>{item.remarks || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Linked RFQs */}
      {requirement.rfqs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked RFQs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requirement.rfqs.map((rfq) => (
                <div
                  key={rfq.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <Link
                    href={`/rfq/${rfq.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {rfq.number}
                  </Link>
                  <StatusBadge status={rfq.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
            <TimelineItem
              status="DRAFT"
              label="Created"
              date={requirement.createdAt}
              active={true}
            />
            <TimelineItem
              status="SUBMITTED"
              label="Submitted"
              date={
                requirement.status !== "DRAFT"
                  ? requirement.updatedAt
                  : undefined
              }
              active={requirement.status !== "DRAFT"}
            />
            <TimelineItem
              status={requirement.status === "REJECTED" ? "REJECTED" : "APPROVED"}
              label={requirement.status === "REJECTED" ? "Rejected" : "Approved"}
              date={
                requirement.status === "APPROVED" ||
                requirement.status === "REJECTED" ||
                requirement.status === "CONVERTED"
                  ? requirement.updatedAt
                  : undefined
              }
              active={
                requirement.status === "APPROVED" ||
                requirement.status === "REJECTED" ||
                requirement.status === "CONVERTED"
              }
            />
            {requirement.status === "CONVERTED" && (
              <TimelineItem
                status="CONVERTED"
                label="Converted to RFQ"
                date={requirement.updatedAt}
                active={true}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Requirement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejectReason">Rejection Reason</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejection"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// TIMELINE ITEM
// ============================================================

function TimelineItem({
  label,
  date,
  active,
}: {
  status: string;
  label: string;
  date?: string;
  active: boolean;
}) {
  return (
    <div className="relative flex items-start gap-3">
      <div
        className={`absolute -left-4 mt-1.5 size-3 rounded-full border-2 ${
          active
            ? "border-primary bg-primary"
            : "border-muted-foreground/30 bg-background"
        }`}
      />
      <div>
        <p
          className={`text-sm font-medium ${
            active ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
        {date && (
          <p className="text-xs text-muted-foreground">
            {formatDateTime(date)}
          </p>
        )}
      </div>
    </div>
  );
}
