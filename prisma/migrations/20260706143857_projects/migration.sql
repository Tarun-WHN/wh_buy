-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "rfqId" TEXT,
    "projectId" TEXT,
    "vendorId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "deliveryDate" DATETIME,
    "shippingAddress" TEXT,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "freightAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "vendorAcceptedAt" DATETIME,
    "vendorRejectedAt" DATETIME,
    "vendorRejectReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "PurchaseOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseOrder" ("createdAt", "createdById", "deletedAt", "deliveryDate", "deliveryTerms", "freightAmount", "id", "number", "paymentTerms", "remarks", "revision", "rfqId", "shippingAddress", "status", "subtotal", "taxAmount", "totalAmount", "updatedAt", "vendorAcceptedAt", "vendorId", "vendorRejectReason", "vendorRejectedAt", "warehouseId") SELECT "createdAt", "createdById", "deletedAt", "deliveryDate", "deliveryTerms", "freightAmount", "id", "number", "paymentTerms", "remarks", "revision", "rfqId", "shippingAddress", "status", "subtotal", "taxAmount", "totalAmount", "updatedAt", "vendorAcceptedAt", "vendorId", "vendorRejectReason", "vendorRejectedAt", "warehouseId" FROM "PurchaseOrder";
DROP TABLE "PurchaseOrder";
ALTER TABLE "new_PurchaseOrder" RENAME TO "PurchaseOrder";
CREATE UNIQUE INDEX "PurchaseOrder_number_key" ON "PurchaseOrder"("number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");
