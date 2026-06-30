"use client";

import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCategory,
  createSubcategory,
  createProductGroup,
} from "@/actions/product.actions";

type Level = "category" | "subcategory" | "group";

const LABELS: Record<Level, string> = {
  category: "Category",
  subcategory: "Sub-category",
  group: "Product Group",
};

function suggestCode(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

interface Props {
  level: Level;
  /** categoryId for a subcategory, subcategoryId for a group */
  parentId?: string;
  disabled?: boolean;
  /** Called with the newly-created record's id so the parent can refresh + select it. */
  onCreated: (id: string) => void | Promise<void>;
}

export function CreateTaxonomyButton({
  level,
  parentId,
  disabled,
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeEdited, setCodeEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleNameChange(v: string) {
    setName(v);
    if (!codeEdited) setCode(suggestCode(v));
  }

  function reset() {
    setName("");
    setCode("");
    setCodeEdited(false);
  }

  async function handleSave() {
    if (!name.trim() || !code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    setSaving(true);
    try {
      let created: { id: string };
      if (level === "category") {
        created = await createCategory({ name: name.trim(), code: code.trim() });
      } else if (level === "subcategory") {
        if (!parentId) throw new Error("Select a category first");
        created = await createSubcategory({
          name: name.trim(),
          code: code.trim(),
          categoryId: parentId,
        });
      } else {
        if (!parentId) throw new Error("Select a sub-category first");
        created = await createProductGroup({
          name: name.trim(),
          code: code.trim(),
          subcategoryId: parentId,
        });
      }
      toast.success(`${LABELS[level]} created`);
      setOpen(false);
      reset();
      await onCreated(created.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to create ${LABELS[level]}`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="brand"
        size="icon-sm"
        disabled={disabled}
        title={`New ${LABELS[level]}`}
        aria-label={`New ${LABELS[level]}`}
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New {LABELS[level]}</DialogTitle>
            <DialogDescription>
              Create a new {LABELS[level].toLowerCase()} and use it right away.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="tax-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tax-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={`${LABELS[level]} name`}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tax-code">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tax-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setCodeEdited(true);
                }}
                placeholder="Short code"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Creating..." : `Create ${LABELS[level]}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
