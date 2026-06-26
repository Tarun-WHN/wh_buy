import * as XLSX from "xlsx";

/**
 * Export an array of objects to a CSV file and trigger download.
 */
export function exportToCsv(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;

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
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export an array of objects to an Excel file and trigger download.
 */
export function exportToExcel(
  data: Record<string, any>[],
  filename: string,
  sheetName: string = "Sheet1"
) {
  if (data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const finalFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, finalFilename);
}
