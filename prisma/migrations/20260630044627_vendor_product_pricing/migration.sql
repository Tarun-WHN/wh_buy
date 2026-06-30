/*
  Warnings:

  - Added the required column `updatedAt` to the `VendorProduct` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VendorProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rate" REAL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "moq" REAL,
    "leadTimeDays" INTEGER,
    "validUntil" DATETIME,
    "quoteFilePath" TEXT,
    "quoteFileName" TEXT,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VendorProduct_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VendorProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_VendorProduct" ("id", "productId", "vendorId") SELECT "id", "productId", "vendorId" FROM "VendorProduct";
DROP TABLE "VendorProduct";
ALTER TABLE "new_VendorProduct" RENAME TO "VendorProduct";
CREATE UNIQUE INDEX "VendorProduct_vendorId_productId_key" ON "VendorProduct"("vendorId", "productId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
