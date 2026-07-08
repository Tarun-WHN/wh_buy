-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "vendorInvoiceNo" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "dueDate" DATETIME,
    "subtotal" REAL NOT NULL,
    "taxAmount" REAL NOT NULL,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "poMatchStatus" TEXT,
    "grnMatchStatus" TEXT,
    "matchRemarks" TEXT,
    "filePath" TEXT,
    "fileName" TEXT,
    "deductionAmount" REAL NOT NULL DEFAULT 0,
    "deductionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("createdAt", "dueDate", "filePath", "grnMatchStatus", "id", "invoiceDate", "matchRemarks", "number", "poMatchStatus", "purchaseOrderId", "status", "subtotal", "taxAmount", "totalAmount", "updatedAt", "vendorId", "vendorInvoiceNo") SELECT "createdAt", "dueDate", "filePath", "grnMatchStatus", "id", "invoiceDate", "matchRemarks", "number", "poMatchStatus", "purchaseOrderId", "status", "subtotal", "taxAmount", "totalAmount", "updatedAt", "vendorId", "vendorInvoiceNo" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
