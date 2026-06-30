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
import { formatDateTime } from "@/lib/utils";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  getWarehousesForForm,
} from "@/actions/user.actions";

// ============================================================
// TYPES
// ============================================================

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: { id: string; name: string; label: string };
  warehouse: { id: string; name: string; code: string } | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface RoleOption {
  id: string;
  name: string;
  label: string;
  isSystem: boolean;
  permissions: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

// ============================================================
// PAGE
// ============================================================

export default function UsersPage() {
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRoleId, setFormRoleId] = useState("");
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [formActive, setFormActive] = useState(true);

  useEffect(() => {
    loadData();
  }, [search, roleFilter]);

  function loadData() {
    startTransition(async () => {
      try {
        const [usersData, rolesData, warehousesData] = await Promise.all([
          getUsers({ search: search || undefined, role: roleFilter || undefined }),
          getRoles(),
          getWarehousesForForm(),
        ]);
        setUsers(usersData.data as unknown as UserRow[]);
        setRoles(rolesData as unknown as RoleOption[]);
        setWarehouses(warehousesData as unknown as WarehouseOption[]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load users");
      }
    });
  }

  function openAddDialog() {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRoleId("");
    setFormWarehouseId("");
    setFormActive(true);
    setDialogOpen(true);
  }

  function openEditDialog(user: UserRow) {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword("");
    setFormRoleId(user.role.id);
    setFormWarehouseId(user.warehouse?.id || "");
    setFormActive(user.isActive);
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: formName,
          email: formEmail,
          roleId: formRoleId,
          warehouseId: formWarehouseId || undefined,
          isActive: formActive,
        });
        toast.success("User updated successfully");
      } else {
        if (!formPassword) {
          toast.error("Password is required for new users");
          return;
        }
        await createUser({
          name: formName,
          email: formEmail,
          password: formPassword,
          roleId: formRoleId,
          warehouseId: formWarehouseId || undefined,
        });
        toast.success("User created successfully");
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save user");
    }
  }

  async function handleDelete() {
    if (!deletingUser) return;
    try {
      await deleteUser(deletingUser.id);
      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  // ============================================================
  // COLUMNS
  // ============================================================

  const columns: ColumnDef<UserRow, unknown>[] = [
    {
      accessorKey: "name",
      header: SortableHeader("Name"),
    },
    {
      accessorKey: "email",
      header: SortableHeader("Email"),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.role.label}</Badge>
      ),
    },
    {
      accessorKey: "warehouse",
      header: "Warehouse",
      cell: ({ row }) => row.original.warehouse?.name || "-",
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
      accessorKey: "lastLoginAt",
      header: SortableHeader("Last Login"),
      cell: ({ row }) =>
        row.original.lastLoginAt
          ? formatDateTime(row.original.lastLoginAt)
          : "Never",
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
              setDeletingUser(row.original);
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
        title="User Management"
        description="Manage users and their access"
      >
        <Button variant="brand" onClick={openAddDialog}>
          <Plus className="mr-2 size-4" />
          Add User
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={roleFilter || "all"} onValueChange={(v: string | null) => setRoleFilter(!v || v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.name}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={users} />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Add User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full name"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@company.com"
                className="mt-1.5"
              />
            </div>
            {!editingUser && (
              <div>
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="mt-1.5"
                />
              </div>
            )}
            <div>
              <Label>Role *</Label>
              <Select value={formRoleId} onValueChange={(v: string | null) => setFormRoleId(v ?? "")}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select role" />
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
              <Label>Warehouse</Label>
              <Select value={formWarehouseId || "none"} onValueChange={(v: string | null) => setFormWarehouseId(!v || v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select warehouse (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editingUser && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="active"
                  checked={formActive}
                  onCheckedChange={(checked) => setFormActive(!!checked)}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            )}
            <Button onClick={handleSave} className="w-full">
              {editingUser ? "Update User" : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingUser?.name}? This action
              will deactivate the user account.
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
