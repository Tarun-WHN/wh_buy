// ============================================================
// ROLES
// ============================================================

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PROCUREMENT_HEAD: "PROCUREMENT_HEAD",
  PROCUREMENT_MANAGER: "PROCUREMENT_MANAGER",
  BUYER: "BUYER",
  ACCOUNTS: "ACCOUNTS",
  OPERATIONS: "OPERATIONS",
  VENDOR: "VENDOR",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

// ============================================================
// STATUS ENUMS
// ============================================================

export const REQUIREMENT_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CONVERTED: "CONVERTED",
  CANCELLED: "CANCELLED",
} as const;

export const RFQ_STATUS = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  PARTIALLY_RESPONDED: "PARTIALLY_RESPONDED",
  FULLY_RESPONDED: "FULLY_RESPONDED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
} as const;

export const QUOTATION_STATUS = {
  PENDING: "PENDING",
  RECEIVED: "RECEIVED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;

export const PO_STATUS = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  SENT: "SENT",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  PARTIALLY_DELIVERED: "PARTIALLY_DELIVERED",
  FULLY_DELIVERED: "FULLY_DELIVERED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export const DELIVERY_STATUS = {
  SCHEDULED: "SCHEDULED",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  PARTIALLY_DELIVERED: "PARTIALLY_DELIVERED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;

export const GRN_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const INVOICE_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  VERIFIED: "VERIFIED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PAID: "PAID",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  CANCELLED: "CANCELLED",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export const APPROVAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  ESCALATED: "ESCALATED",
} as const;

export const VENDOR_REGISTRATION_STATUS = {
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  BLACKLISTED: "BLACKLISTED",
} as const;

// ============================================================
// PRIORITY LEVELS
// ============================================================

export const PRIORITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

// ============================================================
// PAYMENT MODES
// ============================================================

export const PAYMENT_MODES = {
  NEFT: "NEFT",
  RTGS: "RTGS",
  CHEQUE: "CHEQUE",
  UPI: "UPI",
} as const;

export type PaymentMode = (typeof PAYMENT_MODES)[keyof typeof PAYMENT_MODES];

// ============================================================
// UNITS OF MEASUREMENT
// ============================================================

export const UOM_OPTIONS = [
  "Nos",
  "Kg",
  "Ltr",
  "Mtr",
  "Sqft",
  "Set",
  "Pair",
  "Box",
  "Bundle",
  "Ton",
] as const;

export type UOM = (typeof UOM_OPTIONS)[number];

// ============================================================
// CURRENCY FORMATTER
// ============================================================

export const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
