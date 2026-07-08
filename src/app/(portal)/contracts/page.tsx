"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { analyzeContract } from "@/actions/contract.actions";

const FIELDS: [string, string][] = [
  ["title", "Title"],
  ["parties", "Parties"],
  ["validity", "Validity"],
  ["priceLock", "Price lock"],
  ["paymentTerms", "Payment terms"],
  ["penalty", "Penalty"],
  ["warranty", "Warranty"],
  ["amc", "AMC"],
  ["escalationClause", "Escalation clause"],
  ["renewalDate", "Renewal date"],
];

export default function ContractsPage() {
  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<Record<string, string> | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setFilePath(data.filePath);
      setFileName(data.fileName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function analyze() {
    if (!filePath) return;
    setAnalyzing(true);
    try {
      setResult((await analyzeContract(filePath)) as Record<string, string>);
      toast.success("Contract analyzed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Contract Analyzer"
        description="Upload a vendor contract (PDF or image) and let AI extract the key commercial terms."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload contract</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filePath ? (
            <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
              <FileText className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate">{fileName}</span>
              <button
                type="button"
                onClick={() => {
                  setFilePath("");
                  setFileName("");
                  setResult(null);
                }}
                className="text-xs text-muted-foreground hover:underline"
              >
                replace
              </button>
            </div>
          ) : (
            <FileUpload
              onUpload={handleFile}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              label={uploading ? "Uploading…" : "Upload contract (PDF/image)"}
            />
          )}
          {filePath && (
            <Button variant="brand" onClick={analyze} disabled={analyzing}>
              <Sparkles className="mr-1.5 size-4" />
              {analyzing ? "Analyzing…" : "Analyze contract"}
            </Button>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extracted terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.summary && (
              <p className="rounded-lg bg-muted/40 p-3 text-sm">{result.summary}</p>
            )}
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {FIELDS.map(([key, label]) => (
                <div key={key} className="border-b pb-2">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {label}
                  </div>
                  <div className="text-sm">{result[key]?.trim() ? result[key] : "—"}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              AI-extracted — verify against the source document before relying on it.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
