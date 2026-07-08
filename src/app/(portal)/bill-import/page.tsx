"use client";

import { CloudUpload, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportButton } from "@/components/masters/import-button";
import { importBills } from "@/actions/bill-import.actions";

export default function BillImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bill / Price Import"
        description="Upload historical bills or price data (CSV or Excel) to seed the system with real rates, vendors and cities."
      >
        <ImportButton
          label="Upload bills"
          templateName="bills"
          headers={["SKU", "Product", "Vendor", "Rate", "City", "State", "Date", "Quantity", "PONumber"]}
          sample={["RAK-SAR-001", "Slotted Angle Rack 6x3x1.5ft", "Godrej Interio", "4300", "Bengaluru", "Karnataka", "2026-06-20", "10", "PO-1234"]}
          action={importBills}
        />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Each row is matched to a product (by SKU, or by name) and a vendor
            (created automatically if new). From your data we update:
          </p>
          <ul className="space-y-2">
            {[
              "Price history — powers Benchmarking, Savings, Recommendations & Negotiation",
              "Vendor ↔ product rate — powers Consolidation & the Knowledge Graph",
              "Vendor's city of supply — captured when the vendor is new",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Columns</p>
            SKU or Product (one required) · Vendor (required) · Rate (required) ·
            City · State · Date · Quantity · PONumber
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <CloudUpload className="mt-0.5 size-4 shrink-0" />
            Tip: products must already exist in Product Master (import them first if
            needed). Vendors are created on the fly and marked Pending for you to
            complete later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
