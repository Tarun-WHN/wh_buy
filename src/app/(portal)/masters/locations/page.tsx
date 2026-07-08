"use client";

import * as React from "react";
import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  LocationTree,
  type LocationTreeData,
} from "@/components/masters/location-tree";
import {
  getLocations,
  createCompany,
  updateCompany,
  deleteCompany,
  createRegion,
  updateRegion,
  deleteRegion,
  createState,
  updateState,
  deleteState,
  createCity,
  updateCity,
  deleteCity,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  importLocations,
} from "@/actions/location.actions";
import { ImportButton } from "@/components/masters/import-button";

// ============================================================
// TYPES
// ============================================================

type NodeLevel = "company" | "region" | "state" | "city" | "warehouse";

interface FormData {
  name: string;
  code: string;
  address?: string;
  isActive: boolean;
  parentId?: string;
}

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationTreeData>([]);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [currentLevel, setCurrentLevel] = useState<NodeLevel>("company");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    level: NodeLevel;
    id: string;
    name: string;
  } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    code: "",
    address: "",
    isActive: true,
  });

  // Load data
  useEffect(() => {
    loadLocations();
  }, []);

  function loadLocations() {
    startTransition(async () => {
      try {
        const data = await getLocations();
        setLocations(data as LocationTreeData);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load locations"
        );
      }
    });
  }

  // ============================================================
  // HANDLERS
  // ============================================================

  function handleAdd(level: NodeLevel, parentId?: string) {
    setDialogMode("add");
    setCurrentLevel(level);
    setCurrentId(null);
    setFormData({
      name: "",
      code: "",
      address: "",
      isActive: true,
      parentId,
    });
    setDialogOpen(true);
  }

  function handleEdit(level: NodeLevel, item: Record<string, unknown>) {
    setDialogMode("edit");
    setCurrentLevel(level);
    setCurrentId(item.id as string);
    setFormData({
      name: (item.name as string) || "",
      code: (item.code as string) || "",
      address: (item.address as string) || "",
      isActive: (item.isActive as boolean) ?? true,
      parentId:
        (item.companyId as string) ||
        (item.regionId as string) ||
        (item.stateId as string) ||
        (item.cityId as string) ||
        undefined,
    });
    setDialogOpen(true);
  }

  function handleDeleteConfirm(level: NodeLevel, id: string, name: string) {
    setDeleteTarget({ level, id, name });
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (dialogMode === "add") {
        switch (currentLevel) {
          case "company":
            await createCompany({
              name: formData.name,
              code: formData.code,
              address: formData.address,
              isActive: formData.isActive,
            });
            break;
          case "region":
            await createRegion({
              name: formData.name,
              code: formData.code,
              companyId: formData.parentId!,
              isActive: formData.isActive,
            });
            break;
          case "state":
            await createState({
              name: formData.name,
              code: formData.code,
              regionId: formData.parentId!,
              isActive: formData.isActive,
            });
            break;
          case "city":
            await createCity({
              name: formData.name,
              code: formData.code,
              stateId: formData.parentId!,
              isActive: formData.isActive,
            });
            break;
          case "warehouse":
            await createWarehouse({
              name: formData.name,
              code: formData.code,
              address: formData.address,
              cityId: formData.parentId!,
              isActive: formData.isActive,
            });
            break;
        }
        toast.success(`${capitalize(currentLevel)} created successfully`);
      } else {
        switch (currentLevel) {
          case "company":
            await updateCompany(currentId!, {
              name: formData.name,
              code: formData.code,
              address: formData.address,
              isActive: formData.isActive,
            });
            break;
          case "region":
            await updateRegion(currentId!, {
              name: formData.name,
              code: formData.code,
              companyId: formData.parentId!,
              isActive: formData.isActive,
            });
            break;
          case "state":
            await updateState(currentId!, {
              name: formData.name,
              code: formData.code,
              regionId: formData.parentId!,
              isActive: formData.isActive,
            });
            break;
          case "city":
            await updateCity(currentId!, {
              name: formData.name,
              code: formData.code,
              stateId: formData.parentId!,
              isActive: formData.isActive,
            });
            break;
          case "warehouse":
            await updateWarehouse(currentId!, {
              name: formData.name,
              code: formData.code,
              address: formData.address,
              cityId: formData.parentId!,
              isActive: formData.isActive,
            });
            break;
        }
        toast.success(`${capitalize(currentLevel)} updated successfully`);
      }
      setDialogOpen(false);
      loadLocations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      switch (deleteTarget.level) {
        case "company":
          await deleteCompany(deleteTarget.id);
          break;
        case "region":
          await deleteRegion(deleteTarget.id);
          break;
        case "state":
          await deleteState(deleteTarget.id);
          break;
        case "city":
          await deleteCity(deleteTarget.id);
          break;
        case "warehouse":
          await deleteWarehouse(deleteTarget.id);
          break;
      }
      toast.success(`${capitalize(deleteTarget.level)} deleted successfully`);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadLocations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const showAddress = currentLevel === "company" || currentLevel === "warehouse";
  const levelLabel = capitalize(currentLevel);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Location Master"
        description="Manage your organization's location hierarchy"
      >
        <div className="flex items-center gap-2">
          <ImportButton
            label="Import warehouses"
            templateName="warehouses"
            headers={["Region", "State", "City", "Warehouse", "WarehouseCode", "Address"]}
            sample={["South", "Karnataka", "Bengaluru", "Whitefield DC", "WF-01", "Whitefield, Bengaluru"]}
            action={importLocations}
            onDone={() => loadLocations()}
          />
          <Button variant="brand" onClick={() => handleAdd("company")}>
            <Plus className="mr-1.5 size-4" />
            Add Company
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading locations...
            </div>
          ) : (
            <LocationTree
              data={locations}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDeleteConfirm}
            />
          )}
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* ADD / EDIT DIALOG */}
      {/* ============================================================ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add" ? `Add ${levelLabel}` : `Edit ${levelLabel}`}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((d) => ({ ...d, name: e.target.value }))
                }
                placeholder={`${levelLabel} name`}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData((d) => ({ ...d, code: e.target.value }))
                }
                placeholder={`${levelLabel} code`}
              />
            </div>

            {showAddress && (
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address || ""}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, address: e.target.value }))
                  }
                  placeholder="Address"
                  rows={3}
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked: boolean) =>
                  setFormData((d) => ({ ...d, isActive: checked }))
                }
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button onClick={handleSave}>
              {dialogMode === "add" ? "Create" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ============================================================ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.name}
            </span>
            ? This action cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
