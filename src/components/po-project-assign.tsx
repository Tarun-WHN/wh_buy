"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FolderKanban } from "lucide-react";
import { getProjectOptions, assignPoProject } from "@/actions/project.actions";

export function PoProjectAssign({
  poId,
  initialProjectId,
}: {
  poId: string;
  initialProjectId: string | null;
}) {
  const [options, setOptions] = useState<{ id: string; name: string; code: string }[]>([]);
  const [value, setValue] = useState(initialProjectId ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProjectOptions()
      .then((o) => setOptions(o as never))
      .catch(() => {});
  }, []);

  async function change(v: string) {
    setValue(v);
    setSaving(true);
    try {
      await assignPoProject(poId, v || null);
      toast.success(v ? "Assigned to project" : "Removed from project");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <FolderKanban className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground">Project:</span>
      <select
        value={value}
        onChange={(e) => change(e.target.value)}
        disabled={saving}
        className="h-7 rounded-md border border-input bg-transparent px-1.5 text-sm outline-none"
      >
        <option value="">Unassigned</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} ({o.code})
          </option>
        ))}
      </select>
    </div>
  );
}
