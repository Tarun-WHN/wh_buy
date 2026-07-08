"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  /** Button label */
  label?: string;
  /** File name (without extension) for the template */
  templateName: string;
  /** Column headers, in order */
  headers: string[];
  /** Optional example row (aligned to headers) */
  sample?: string[];
  /** Server action that imports parsed rows */
  action: (rows: Record<string, string>[]) => Promise<{ success: number; errors: string[] }>;
  /** Called after a successful import so the page can refresh */
  onDone?: () => void;
}

export function ImportButton({
  label = "Import",
  templateName,
  headers,
  sample,
  action,
  onDone,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const rows = [headers.join(",")];
    if (sample) rows.push(sample.map((s) => `"${s}"`).join(","));
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${templateName}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setBusy(true);
    setResult(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
        defval: "",
        raw: false,
      });
      if (rows.length === 0) {
        toast.error("No rows found in the file");
        return;
      }
      const res = await action(rows);
      setResult(res);
      if (res.success > 0) {
        toast.success(`Imported ${res.success} row(s)`);
        onDone?.();
      } else if (res.errors.length) {
        toast.error("Nothing imported — see details");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => { setResult(null); setOpen(true); }}>
        <Upload className="mr-1.5 size-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import from file</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file. Download the template to see the exact
              columns.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              Columns: {headers.join(", ")}
            </div>

            <Button variant="outline" className="w-full" onClick={downloadTemplate}>
              <Download className="mr-1.5 size-4" />
              Download template (.csv)
            </Button>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              variant="brand"
              className="w-full"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <FileSpreadsheet className="mr-1.5 size-4" />
              {busy ? "Importing…" : "Choose file & import"}
            </Button>

            {result && (
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium text-emerald-600">
                  {result.success} row(s) imported
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto text-xs text-muted-foreground">
                    <p className="mb-1 font-medium text-amber-600">
                      {result.errors.length} skipped/failed:
                    </p>
                    <ul className="space-y-0.5">
                      {result.errors.slice(0, 30).map((er, i) => (
                        <li key={i}>• {er}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
