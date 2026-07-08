-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "filePath" TEXT;

-- AlterTable
ALTER TABLE "Rfq" ADD COLUMN "awardedQuotationId" TEXT;
ALTER TABLE "Rfq" ADD COLUMN "selectionRemarks" TEXT;
