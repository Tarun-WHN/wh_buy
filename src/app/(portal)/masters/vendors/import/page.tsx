"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileText, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { importVendors } from "@/actions/vendor.actions";

// ============================================================
// TYPES
// ============================================================

interface ImportResult {
  success: number;
  errors: string[];
}

interface ParsedRow {
  name: string;
  code: string;
  contactperson: string;
  email: string;
  phone: string;
  [key: string]: string;
}

// ============================================================
// PAGE
// ============================================================

export default function VendorImportPage() {
  const [isPending, startTransition] = useTransition();
  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  }

  function parseCSV(text: string) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setParsedRows([]);
      setHeaders([]);
      return;
    }

    const hdrs = lines[0].split(",").map((h) => h.trim().toLowerCase());
    setHeaders(hdrs);

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};
      hdrs.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });
      rows.push(row as ParsedRow);
    }
    setParsedRows(rows);
  }

  async function handleImport() {
    if (!csvContent) {
      toast.error("No CSV data to import");
      return;
    }

    startTransition(async () => {
      try {
        const res = await importVendors(csvContent);
        setResult(res);
        if (res.success > 0) {
          toast.success(`${res.success} vendor(s) imported successfully`);
        }
        if (res.errors.length > 0) {
          toast.error(`${res.errors.length} error(s) during import`);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Import failed"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Vendors"
        description="Bulk import vendors from a CSV file"
      >
        <Button variant="outline" render={<Link href="/masters/vendors" />}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back to Vendors
        </Button>
      </PageHeader>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with the following columns. Required columns are
            marked with *.
          </p>
          <div className="rounded-md bg-muted p-3 font-mono text-xs">
            name*, code*, contactperson*, email*, phone*, legalname, address,
            city, state, pincode, gstnumber, pannumber, paymentterms
          </div>
          <p className="text-xs text-muted-foreground">
            Example row: Apex Supplies, APX001, Rajesh Kumar, rajesh@apex.com,
            9876543210, Apex Pvt Ltd, 123 Industrial Area, Mumbai, Maharashtra,
            400001, 27AAACR1234A1Z5, AAACR1234A, Net 30
          </p>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8">
            <FileText className="size-10 text-muted-foreground/50 mb-3" />
            <label className="cursor-pointer">
              <span className="text-sm font-medium text-primary hover:underline">
                Choose a CSV file
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {fileName && (
              <p className="mt-2 text-sm text-muted-foreground">
                Selected: {fileName}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Preview ({parsedRows.length} rows)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-left font-medium text-muted-foreground">
                      #
                    </th>
                    {headers.map((h) => (
                      <th
                        key={h}
                        className="py-2 px-3 text-left font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2 px-3 text-muted-foreground">
                        {idx + 1}
                      </td>
                      {headers.map((h) => (
                        <td key={h} className="py-2 px-3">
                          {row[h] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {parsedRows.length > 10 && (
                    <tr>
                      <td
                        colSpan={headers.length + 1}
                        className="py-2 px-3 text-center text-muted-foreground text-xs"
                      >
                        ... and {parsedRows.length - 10} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={handleImport} disabled={isPending}>
                <Upload className="mr-1.5 size-4" />
                {isPending ? "Importing..." : `Import ${parsedRows.length} Vendors`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-green-600" />
              <span>
                {result.success} vendor(s) imported successfully
              </span>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="size-4" />
                  <span>{result.errors.length} error(s)</span>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-md bg-muted p-3 text-xs space-y-1">
                  {result.errors.map((err, idx) => (
                    <p key={idx}>{err}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
