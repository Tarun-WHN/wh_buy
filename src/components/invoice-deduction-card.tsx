"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadInvoice, setInvoiceDeduction } from "@/actions/invoice.actions";

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function InvoiceDeductionCard({
  invoiceId,
  totalAmount,
  initialDeduction,
  initialReason,
  initialFilePath,
  initialFileName,
}: {
  invoiceId: string;
  totalAmount: number;
  initialDeduction: number;
  initialReason: string | null;
  initialFilePath: string | null;
  initialFileName: string | null;
}) {
  const [filePath, setFilePath] = useState(initialFilePath);
  const [fileName, setFileName] = useState(initialFileName);
  const [deduction, setDeduction] = useState(String(initialDeduction || ""));
  const [reason, setReason] = useState(initialReason ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const net = Math.max(0, totalAmount - (parseFloat(deduction) || 0));

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      await uploadInvoice(invoiceId, data.filePath, data.fileName);
      setFilePath(data.filePath);
      setFileName(data.fileName);
      toast.success("Invoice document uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function saveDeduction() {
    setSaving(true);
    try {
      await setInvoiceDeduction(invoiceId, parseFloat(deduction) || 0, reason);
      toast.success("Deduction saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Vendor invoice & deduction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* invoice document */}
        <div className="grid gap-2">
          <Label>Vendor invoice document</Label>
          {filePath ? (
            <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
              <FileText className="size-4 text-muted-foreground" />
              <a
                href={filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-[#F47B20] hover:underline"
              >
                {fileName || "View document"}
              </a>
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </div>
          ) : (
            <FileUpload
              onUpload={handleFile}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv,.doc,.docx"
              label={uploading ? "Uploading…" : "Upload invoice"}
            />
          )}
          {filePath && (
            <button
              type="button"
              onClick={() => {
                setFilePath(null);
                setFileName(null);
              }}
              className="self-start text-xs text-muted-foreground hover:underline"
            >
              Replace document
            </button>
          )}
        </div>

        {/* deduction */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Deduction amount (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={deduction}
              onChange={(e) => setDeduction(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="grid gap-2">
            <Label>Deduction reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. short supply, damage, rate difference"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            Invoice {money(totalAmount)} − Deduction {money(parseFloat(deduction) || 0)} ={" "}
            <span className="font-semibold text-foreground">Net payable {money(net)}</span>
          </span>
          <Button variant="brand" size="sm" onClick={saveDeduction} disabled={saving}>
            {saving ? "Saving…" : "Save deduction"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
