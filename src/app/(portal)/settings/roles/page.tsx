"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Shield, Users, Pencil, Check, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getRoles, getUsers, updateRolePermissions } from "@/actions/user.actions";
import { PERMISSIONS, getPermissionsForRole } from "@/lib/permissions";
import { useSession } from "next-auth/react";

// ============================================================
// TYPES
// ============================================================

interface RoleData {
  id: string;
  name: string;
  label: string;
  isSystem: boolean;
  permissions: string;
}

// ============================================================
// PERMISSION GROUPS
// ============================================================

const PERMISSION_GROUPS = [
  {
    label: "Master Data",
    permissions: [
      { key: PERMISSIONS.LOCATION_MANAGE, label: "Manage Locations" },
      { key: PERMISSIONS.PRODUCT_MANAGE, label: "Manage Products" },
      { key: PERMISSIONS.VENDOR_MANAGE, label: "Manage Vendors" },
    ],
  },
  {
    label: "Procurement",
    permissions: [
      { key: PERMISSIONS.REQUIREMENT_CREATE, label: "Create Requirements" },
      { key: PERMISSIONS.REQUIREMENT_APPROVE, label: "Approve Requirements" },
      { key: PERMISSIONS.RFQ_CREATE, label: "Create RFQs" },
      { key: PERMISSIONS.RFQ_APPROVE, label: "Approve RFQs" },
      { key: PERMISSIONS.PO_CREATE, label: "Create Purchase Orders" },
      { key: PERMISSIONS.PO_APPROVE, label: "Approve Purchase Orders" },
    ],
  },
  {
    label: "Operations",
    permissions: [
      { key: PERMISSIONS.DELIVERY_MANAGE, label: "Manage Deliveries" },
      { key: PERMISSIONS.GRN_CREATE, label: "Create GRN" },
    ],
  },
  {
    label: "Finance",
    permissions: [
      { key: PERMISSIONS.INVOICE_MANAGE, label: "Manage Invoices" },
      { key: PERMISSIONS.PAYMENT_MANAGE, label: "Manage Payments" },
    ],
  },
  {
    label: "Administration",
    permissions: [
      { key: PERMISSIONS.ANALYTICS_VIEW, label: "View Analytics" },
      { key: PERMISSIONS.USER_MANAGE, label: "Manage Users" },
      { key: PERMISSIONS.APPROVAL_RULES_MANAGE, label: "Manage Approval Rules" },
    ],
  },
];

const PERMISSION_LABELS: Record<string, string> = {};
PERMISSION_GROUPS.forEach((g) =>
  g.permissions.forEach((p) => {
    PERMISSION_LABELS[p.key] = p.label;
  })
);

// ============================================================
// PAGE
// ============================================================

export default function RolesPage() {
  const { data: sessionData } = useSession();
  const isSuperAdmin = sessionData?.user?.role === "SUPER_ADMIN";

  const [isPending, startTransition] = useTransition();
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleData | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    startTransition(async () => {
      try {
        const [rolesData, usersData] = await Promise.all([
          getRoles(),
          getUsers({ pageSize: 1000 }),
        ]);
        setRoles(rolesData as unknown as RoleData[]);

        const counts: Record<string, number> = {};
        for (const user of usersData.data) {
          const roleName = (user.role as { name: string }).name;
          counts[roleName] = (counts[roleName] || 0) + 1;
        }
        setUserCounts(counts);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load roles");
      }
    });
  }

  function getPermissionNames(role: RoleData): string[] {
    try {
      const perms = JSON.parse(role.permissions);
      if (Array.isArray(perms) && perms.length > 0) return perms;
    } catch {
      // ignore
    }
    return getPermissionsForRole(role.name);
  }

  function openEditDialog(role: RoleData) {
    setEditingRole(role);
    setEditPermissions(getPermissionNames(role));
    setEditDialogOpen(true);
  }

  function togglePermission(perm: string) {
    setEditPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  async function handleSavePermissions() {
    if (!editingRole) return;
    setSaving(true);
    try {
      await updateRolePermissions(editingRole.id, editPermissions);
      toast.success(`Permissions updated for ${editingRole.label}`);
      setEditDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update permissions"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="View and manage roles and their assigned permissions"
      />

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-5 w-32 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-3/4 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const permissions = getPermissionNames(role);
            const canEdit =
              isSuperAdmin && role.name !== "SUPER_ADMIN";

            return (
              <Card key={role.id} className="relative overflow-hidden">
                {role.name === "SUPER_ADMIN" && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#F47B20] to-[#1B2A4A]" />
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={
                          "flex h-8 w-8 items-center justify-center rounded-lg " +
                          (role.name === "SUPER_ADMIN"
                            ? "bg-[#F47B20]/10 text-[#F47B20]"
                            : role.name === "VENDOR"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-primary/10 text-primary")
                        }
                      >
                        <Shield className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {role.label}
                        </CardTitle>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-3" />
                          {userCounts[role.name] || 0} user(s)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-[10px]">
                          System
                        </Badge>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditDialog(role)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {permissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No permissions assigned
                      {role.name === "VENDOR" && " — uses Vendor Portal"}
                    </p>
                  ) : role.name === "SUPER_ADMIN" ? (
                    <Badge className="bg-[#F47B20]/10 text-[#F47B20] border-[#F47B20]/20">
                      All Permissions
                    </Badge>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {permissions.map((perm) => (
                        <Badge
                          key={perm}
                          variant="outline"
                          className="text-[11px] font-normal"
                        >
                          {PERMISSION_LABELS[perm] || perm}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Permissions Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Permissions — {editingRole?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label}>
                <h4 className="mb-2.5 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.label}
                </h4>
                <div className="space-y-2">
                  {group.permissions.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors hover:bg-muted/50 has-[:checked]:border-primary/30 has-[:checked]:bg-primary/5"
                    >
                      <Checkbox
                        checked={editPermissions.includes(perm.key)}
                        onCheckedChange={() => togglePermission(perm.key)}
                      />
                      <span className="text-sm">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {editPermissions.length} permission(s) selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  disabled={saving}
                >
                  <X className="mr-1.5 size-4" />
                  Cancel
                </Button>
                <Button onClick={handleSavePermissions} disabled={saving}>
                  <Check className="mr-1.5 size-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
