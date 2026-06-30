"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/utils";
import { getRoles } from "@/actions/user.actions";
import {
  getApprovalRules,
  getCategories,
  createApprovalRule,
  updateApprovalRule,
  deleteApprovalRule,
} from "@/actions/approval-rule.actions";

// ============================================================
// TYPES
// ============================================================

interface ApprovalRuleRow {
  id: string;
  name: string;
  entity: string;
  category: { id: string; name: string; code: string } | null;
  categoryId: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  approverRoleId: string;
  level: number;
  isActive: boolean;
}

interface RoleOption {
  id: string;
  name: string;
  label: string;
}

interface CategoryOption {
  id: string;
  name: string;
  code: string;
}

// ============================================================
// PAGE
// ============================================================

export default function ApprovalRulesPage() {
  const [isPending, startTransition] = useTransition();
  const [rules, setRules] = useState<ApprovalRuleRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRuleRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRule, setDeletingRule] = useState<ApprovalRuleRow | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEntity, setFormEntity] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formMinAmount, setFormMinAmount] = useState("");
  const [formMaxAmount, setFormMaxAmount] = useState("");
  const [formApproverRoleId, setFormApproverRoleId] = useState("");
  const [formLevel, setFormLevel] = useState("1");
  const [formActive, setFormActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    startTransition(async () => {
      try {
        const [rulesData, rolesData, categoriesData] = await Promise.all([
          getApprovalRules(),
          getRoles(),
          getCategories(),
        ]);
        setRules(rulesData as unknown as ApprovalRuleRow[]);
        setRoles(rolesData as unknown as RoleOption[]);
        setCategories(categoriesData as unknown as CategoryOption[]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load approval rules"
        );
      }
    });
  }

  function openAddDialog() {
    setEditingRule(null);
    setFormName("");
    setFormEntity("");
    setFormCategoryId("");
    setFormMinAmount("");
    setFormMaxAmount("");
    setFormApproverRoleId("");
    setFormLevel("1");
    setFormActive(true);
    setDialogOpen(true);
  }

  function openEditDialog(rule: ApprovalRuleRow) {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormEntity(rule.entity);
    setFormCategoryId(rule.categoryId || "");
    setFormMinAmount(rule.minAmount?.toString() || "");
    setFormMaxAmount(rule.maxAmount?.toString() || "");
    setFormApproverRoleId(rule.approverRoleId);
    setFormLevel(rule.level.toString());
    setFormActive(rule.isActive);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName || !formEntity || !formApproverRoleId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const payload = {
      name: formName,
      entity: formEntity,
      categoryId: formCategoryId || undefined,
      minAmount: formMinAmount ? parseFloat(formMinAmount) : undefined,
      maxAmount: formMaxAmount ? parseFloat(formMaxAmount) : undefined,
      approverRoleId: formApproverRoleId,
      level: parseInt(formLevel) || 1,
      isActive: formActive,
    };

    try {
      if (editingRule) {
        await updateApprovalRule(editingRule.id, payload);
        toast.success("Approval rule updated");
      } else {
        await createApprovalRule(payload);
        toast.success("Approval rule created");
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save approval rule"
      );
    }
  }

  async function handleDelete() {
    if (!deletingRule) return;
    try {
      await deleteApprovalRule(deletingRule.id);
      toast.success("Approval rule deleted");
      setDeleteDialogOpen(false);
      setDeletingRule(null);
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete approval rule"
      );
    }
  }

  function getRoleLabel(roleId: string): string {
    const role = roles.find((r) => r.id === roleId);
    return role?.label || roleId;
  }

  // ============================================================
  // COLUMNS
  // ============================================================

  const columns: ColumnDef<ApprovalRuleRow, unknown>[] = [
    {
      accessorKey: "name",
      header: SortableHeader("Name"),
    },
    {
      accessorKey: "entity",
      header: "Entity Type",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.entity}</Badge>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => row.original.category?.name || "-",
    },
    {
      accessorKey: "minAmount",
      header: "Min Amount",
      cell: ({ row }) =>
        row.original.minAmount != null
          ? formatCurrency(row.original.minAmount)
          : "-",
    },
    {
      accessorKey: "maxAmount",
      header: "Max Amount",
      cell: ({ row }) =>
        row.original.maxAmount != null
          ? formatCurrency(row.original.maxAmount)
          : "-",
    },
    {
      accessorKey: "approverRoleId",
      header: "Approver Role",
      cell: ({ row }) => getRoleLabel(row.original.approverRoleId),
    },
    {
      accessorKey: "level",
      header: SortableHeader("Level"),
    },
    {
      accessorKey: "isActive",
      header: "Active",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openEditDialog(row.original)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setDeletingRule(row.original);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Rules"
        description="Configure approval workflows and thresholds"
      >
        <Button variant="brand" onClick={openAddDialog}>
          <Plus className="mr-2 size-4" />
          Add Rule
        </Button>
      </PageHeader>

      <DataTable columns={columns} data={rules} searchKey="name" searchPlaceholder="Search rules..." />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Approval Rule" : "Add Approval Rule"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Rule name"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Entity Type *</Label>
              <Select value={formEntity} onValueChange={(v: string | null) => setFormEntity(v ?? "")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PO">Purchase Order</SelectItem>
                  <SelectItem value="REQUIREMENT">Requirement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formCategoryId || "none"} onValueChange={(v: string | null) => setFormCategoryId(!v || v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="All categories (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min Amount</Label>
                <Input
                  type="number"
                  value={formMinAmount}
                  onChange={(e) => setFormMinAmount(e.target.value)}
                  placeholder="0"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Max Amount</Label>
                <Input
                  type="number"
                  value={formMaxAmount}
                  onChange={(e) => setFormMaxAmount(e.target.value)}
                  placeholder="No limit"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label>Approver Role *</Label>
              <Select
                value={formApproverRoleId}
                onValueChange={(v: string | null) => setFormApproverRoleId(v ?? "")}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select approver role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Level *</Label>
              <Input
                type="number"
                value={formLevel}
                onChange={(e) => setFormLevel(e.target.value)}
                min={1}
                className="mt-1.5"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ruleActive"
                checked={formActive}
                onCheckedChange={(checked) => setFormActive(!!checked)}
              />
              <Label htmlFor="ruleActive">Active</Label>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Approval Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the rule &quot;{deletingRule?.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
