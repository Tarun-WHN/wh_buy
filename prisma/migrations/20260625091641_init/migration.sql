-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "roleId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "VendorUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    CONSTRAINT "VendorUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VendorUser_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" TEXT NOT NULL DEFAULT '{}',
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Region_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "State_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "City_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "cityId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Warehouse_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Subcategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "ProductGroup_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "uom" TEXT NOT NULL,
    "hsnCode" TEXT,
    "gstPercent" REAL NOT NULL DEFAULT 0,
    "specifications" TEXT,
    "productGroupId" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Product_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "ProductGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "uom" TEXT NOT NULL,
    "specifications" TEXT,
    "changedBy" TEXT NOT NULL,
    "changeReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductVersion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vendor" (
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
    "rating" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "VendorProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "VendorProduct_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VendorProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "VendorCategory_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VendorCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "warehouseId" TEXT NOT NULL,
    "department" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "requiredDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Requirement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Requirement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requirementId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "specifications" TEXT,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RequirementItem_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RequirementItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rfq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requirementId" TEXT,
    "rfqType" TEXT NOT NULL DEFAULT 'SINGLE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submissionDeadline" DATETIME,
    "termsConditions" TEXT,
    "deliveryLocation" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Rfq_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Rfq_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RfqLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rfqId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "specifications" TEXT,
    "targetPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RfqLineItem_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RfqLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RfqVendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rfqId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "dispatchedAt" DATETIME,
    "viewedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "RfqVendor_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RfqVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "validUntil" DATETIME,
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "warranty" TEXT,
    "freight" REAL NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quotation_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quotation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "rfqLineItemId" TEXT NOT NULL,
    "unitPrice" REAL NOT NULL,
    "quantity" REAL NOT NULL,
    "taxPercent" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL,
    "deliveryDays" INTEGER,
    "warranty" TEXT,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuotationItem_rfqLineItemId_fkey" FOREIGN KEY ("rfqLineItemId") REFERENCES "RfqLineItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "unitPrice" REAL NOT NULL,
    "quantity" REAL NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "categoryId" TEXT,
    "minAmount" REAL,
    "maxAmount" REAL,
    "approverRoleId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApprovalRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "requirementId" TEXT,
    "purchaseOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Approval_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Approval_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "approvalId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "comments" TEXT,
    "actionById" TEXT NOT NULL,
    "actionAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalAction_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalAction_actionById_fkey" FOREIGN KEY ("actionById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "rfqId" TEXT,
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
    CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PoLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "uom" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "taxPercent" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL,
    "deliveredQty" REAL NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PoLineItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PoVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changeReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PoVersion_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "lrNumber" TEXT,
    "ewayBillNumber" TEXT,
    "dispatchDate" DATETIME,
    "expectedDate" DATETIME,
    "deliveredDate" DATETIME,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Delivery_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Delivery_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Grn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "receivedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Grn_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrnItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grnId" TEXT NOT NULL,
    "poLineItemId" TEXT NOT NULL,
    "orderedQty" REAL NOT NULL,
    "receivedQty" REAL NOT NULL,
    "acceptedQty" REAL NOT NULL,
    "rejectedQty" REAL NOT NULL DEFAULT 0,
    "rejectReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrnItem_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "Grn" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GrnItem_poLineItemId_fkey" FOREIGN KEY ("poLineItemId") REFERENCES "PoLineItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrnPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "grnId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrnPhoto_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "Grn" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "referenceNo" TEXT,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VendorScorecard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "deliveryScore" REAL NOT NULL,
    "qualityScore" REAL NOT NULL,
    "priceScore" REAL NOT NULL,
    "responseScore" REAL NOT NULL,
    "overallScore" REAL NOT NULL,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VendorScorecard_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedBy" TEXT NOT NULL,
    "vendorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SequenceCounter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VendorUser_userId_key" ON "VendorUser"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Region_companyId_code_key" ON "Region"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "State_regionId_code_key" ON "State"("regionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "City_stateId_code_key" ON "City"("stateId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_categoryId_code_key" ON "Subcategory"("categoryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductGroup_subcategoryId_code_key" ON "ProductGroup"("subcategoryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVersion_productId_version_key" ON "ProductVersion"("productId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_code_key" ON "Vendor"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProduct_vendorId_productId_key" ON "VendorProduct"("vendorId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorCategory_vendorId_categoryId_key" ON "VendorCategory"("vendorId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Requirement_number_key" ON "Requirement"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Rfq_number_key" ON "Rfq"("number");

-- CreateIndex
CREATE UNIQUE INDEX "RfqVendor_rfqId_vendorId_key" ON "RfqVendor"("rfqId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_number_key" ON "Quotation"("number");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_vendorId_idx" ON "PriceHistory"("productId", "vendorId");

-- CreateIndex
CREATE INDEX "ApprovalRule_entity_idx" ON "ApprovalRule"("entity");

-- CreateIndex
CREATE INDEX "Approval_entity_entityId_idx" ON "Approval"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_number_key" ON "PurchaseOrder"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PoVersion_purchaseOrderId_version_key" ON "PoVersion"("purchaseOrderId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_number_key" ON "Delivery"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Grn_number_key" ON "Grn"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "VendorScorecard_vendorId_period_key" ON "VendorScorecard"("vendorId", "period");

-- CreateIndex
CREATE INDEX "Document_entity_entityId_idx" ON "Document"("entity", "entityId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "SequenceCounter_entity_year_key" ON "SequenceCounter"("entity", "year");
