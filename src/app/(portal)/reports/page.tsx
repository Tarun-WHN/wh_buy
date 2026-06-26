"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Users,
  FileSearch,
  ShoppingCart,
  Clock,
  TrendingDown,
  Download,
  Loader2,
} from "lucide-react";
import {
  generateSpendReport,
  generateVendorReport,
  generateRfqReport,
  generatePoReport,
  generateAgingReport,
} from "@/actions/report.actions";
import { getSavingsData } from "@/actions/analytics.actions";
import { exportToCsv, exportToExcel } from "@/lib/export";

type ReportConfig = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  needsDateRange: boolean;
};

const REPORTS: ReportConfig[] = [
  {
    id: "spend",
    title: "Spend Analysis",
    description: "Detailed breakdown of procurement spend by vendor, warehouse and category.",
    icon: FileText,
    needsDateRange: true,
  },
  {
    id: "vendor",
    title: "Vendor Performance",
    description: "Vendor ratings, PO counts, quotation activity and total spend.",
    icon: Users,
    needsDateRange: false,
  },
  {
    id: "rfq",
    title: "RFQ Report",
    description: "All RFQs with status, vendor responses and quotation details.",
    icon: FileSearch,
    needsDateRange: true,
  },
  {
    id: "po",
    title: "PO Report",
    description: "Purchase orders with amounts, delivery status and line item counts.",
    icon: ShoppingCart,
    needsDateRange: true,
  },
  {
    id: "aging",
    title: "Aging Report",
    description: "Outstanding invoices grouped by aging buckets (0-30, 31-60, 61-90, 90+ days).",
    icon: Clock,
    needsDateRange: false,
  },
  {
    id: "savings",
    title: "Savings Report",
    description: "Cost savings achieved by comparing PO prices to historical averages.",
    icon: TrendingDown,
    needsDateRange: false,
  },
];

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export default function ReportsPage() {
  const defaults = getDefaultDates();
  const [dateRanges, setDateRanges] = useState<Record<string, { start: string; end: string }>>(
    Object.fromEntries(REPORTS.map((r) => [r.id, { ...defaults }]))
  );
  const [reportData, setReportData] = useState<Record<string, Record<string, any>[]>>({});
  const [loadingReport, setLoadingReport] = useState<string | null>(null);

  const handleGenerate = async (reportId: string) => {
    setLoadingReport(reportId);
    try {
      const range = dateRanges[reportId];
      let data: Record<string, any>[] = [];

      switch (reportId) {
        case "spend":
          data = await generateSpendReport(range.start, range.end);
          break;
        case "vendor":
          data = await generateVendorReport();
          break;
        case "rfq":
          data = await generateRfqReport(range.start, range.end);
          break;
        case "po":
          data = await generatePoReport(range.start, range.end);
          break;
        case "aging":
          data = await generateAgingReport();
          break;
        case "savings": {
          const savingsResult = await getSavingsData();
          data = savingsResult.details.map((d) => ({
            ...d,
            totalSavings: savingsResult.totalSavings,
            savingsPercent: savingsResult.savingsPercent,
          }));
          if (data.length === 0) {
            data = [
              {
                totalSavings: savingsResult.totalSavings,
                savingsPercent: savingsResult.savingsPercent,
                totalPotentialSpend: savingsResult.totalPotentialSpend,
                note: "No individual savings details available",
              },
            ];
          }
          break;
        }
      }

      setReportData((prev) => ({ ...prev, [reportId]: data }));
    } catch (error) {
      console.error(`Failed to generate ${reportId} report:`, error);
    } finally {
      setLoadingReport(null);
    }
  };

  const handleExportCsv = (reportId: string, title: string) => {
    const data = reportData[reportId];
    if (!data || data.length === 0) return;
    exportToCsv(data, `${title.replace(/\s+/g, "_")}_Report`);
  };

  const handleExportExcel = (reportId: string, title: string) => {
    const data = reportData[reportId];
    if (!data || data.length === 0) return;
    exportToExcel(data, `${title.replace(/\s+/g, "_")}_Report`, title);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Generate, view and export procurement reports."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const data = reportData[report.id];
          const isLoading = loadingReport === report.id;

          return (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>{report.title}</CardTitle>
                    <CardDescription className="mt-1">{report.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {/* Date Range */}
                  {report.needsDateRange && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`${report.id}-start`} className="text-xs">
                          Start Date
                        </Label>
                        <Input
                          id={`${report.id}-start`}
                          type="date"
                          value={dateRanges[report.id].start}
                          onChange={(e) =>
                            setDateRanges((prev) => ({
                              ...prev,
                              [report.id]: { ...prev[report.id], start: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${report.id}-end`} className="text-xs">
                          End Date
                        </Label>
                        <Input
                          id={`${report.id}-end`}
                          type="date"
                          value={dateRanges[report.id].end}
                          onChange={(e) =>
                            setDateRanges((prev) => ({
                              ...prev,
                              [report.id]: { ...prev[report.id], end: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleGenerate(report.id)}
                      disabled={isLoading}
                      size="sm"
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Generate
                    </Button>
                    {data && data.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportCsv(report.id, report.title)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          CSV
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportExcel(report.id, report.title)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Excel
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Data Table */}
                  {data && (
                    <div className="max-h-80 overflow-auto rounded-md border">
                      {data.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          No records found for the selected criteria.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(data[0]).map((key) => (
                                <TableHead key={key} className="whitespace-nowrap text-xs">
                                  {key
                                    .replace(/([A-Z])/g, " $1")
                                    .replace(/^./, (s) => s.toUpperCase())
                                    .trim()}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.slice(0, 50).map((row, idx) => (
                              <TableRow key={idx}>
                                {Object.values(row).map((val, colIdx) => (
                                  <TableCell key={colIdx} className="whitespace-nowrap text-xs">
                                    {typeof val === "number"
                                      ? val.toLocaleString("en-IN")
                                      : val === null || val === undefined
                                        ? "-"
                                        : String(val)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      {data.length > 50 && (
                        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
                          Showing 50 of {data.length} records. Export to view all.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
