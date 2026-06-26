"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt } from "lucide-react";

export default function VendorInvoicesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage your invoices"
      />

      <Card>
        <CardContent className="py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                Invoice management will be available in a future update.
                You will be able to submit invoices against delivered orders
                and track payment status here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
