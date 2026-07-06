-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "legalName" TEXT,
    "gstNumber" TEXT,
    "panNumber" TEXT,
    "cinNumber" TEXT,
    "contactPerson" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfsc" TEXT,
    "paymentTerms" TEXT,
    "leadTimeDays" INTEGER,
    "msmeStatus" TEXT,
    "certifications" TEXT,
    "registrationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "preferenceStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "rating" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
INSERT INTO "new_Vendor" ("address", "bankAccountNumber", "bankIfsc", "bankName", "certifications", "cinNumber", "city", "code", "contactPerson", "createdAt", "deletedAt", "email", "gstNumber", "id", "isActive", "leadTimeDays", "legalName", "msmeStatus", "name", "panNumber", "paymentTerms", "phone", "pincode", "rating", "registrationStatus", "state", "updatedAt") SELECT "address", "bankAccountNumber", "bankIfsc", "bankName", "certifications", "cinNumber", "city", "code", "contactPerson", "createdAt", "deletedAt", "email", "gstNumber", "id", "isActive", "leadTimeDays", "legalName", "msmeStatus", "name", "panNumber", "paymentTerms", "phone", "pincode", "rating", "registrationStatus", "state", "updatedAt" FROM "Vendor";
DROP TABLE "Vendor";
ALTER TABLE "new_Vendor" RENAME TO "Vendor";
CREATE UNIQUE INDEX "Vendor_code_key" ON "Vendor"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
