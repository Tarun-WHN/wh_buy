-- AlterTable
ALTER TABLE "Product" ADD COLUMN "brand" TEXT;
ALTER TABLE "Product" ADD COLUMN "modelNumber" TEXT;
ALTER TABLE "Product" ADD COLUMN "size" TEXT;

-- CreateTable
CREATE TABLE "VendorPerformanceEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'AUTO',
    "quotationId" TEXT,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "rfqCode" TEXT,
    "rfqDate" DATETIME,
    "submissionDeadline" DATETIME,
    "quoteSubmissionDate" DATETIME,
    "quotedRate" REAL,
    "productLabel" TEXT,
    "pricingLevel" INTEGER,
    "scheduledDeliveryDate" DATETIME,
    "actualDeliveryDate" DATETIME,
    "modelMake" TEXT,
    "firstEscalationDate" DATETIME,
    "manualEscalationCount" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VendorPerformanceEntry_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorPerformanceEntry_quotationId_key" ON "VendorPerformanceEntry"("quotationId");

-- CreateIndex
CREATE INDEX "VendorPerformanceEntry_vendorId_idx" ON "VendorPerformanceEntry"("vendorId");
