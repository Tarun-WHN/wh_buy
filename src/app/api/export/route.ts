import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { data, format, filename } = body as {
      data: Record<string, any>[];
      format: "csv" | "excel";
      filename: string;
    };

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    if (format === "csv") {
      const headers = Object.keys(data[0]);
      const escapeCell = (value: any): string => {
        const str = value === null || value === undefined ? "" : String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = [
        headers.map(escapeCell).join(","),
        ...data.map((row) => headers.map((h) => escapeCell(row[h])).join(",")),
      ];
      const csvString = csvRows.join("\n");

      return new NextResponse(csvString, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename || "export"}.csv"`,
        },
      });
    }

    if (format === "excel") {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename || "export"}.xlsx"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid format. Use 'csv' or 'excel'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 }
    );
  }
}
