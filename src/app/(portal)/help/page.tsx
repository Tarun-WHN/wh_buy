"use client";

import * as React from "react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  MapPin,
  Package,
  Users,
  ClipboardList,
  FileText,
  ShoppingCart,
  Truck,
  ClipboardCheck,
  Receipt,
  CreditCard,
  ShieldCheck,
  BarChart3,
  Settings,
  Store,
  FolderTree,
  Tag,
  Gauge,
  Sparkles,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";

// ============================================================
// LIFECYCLE STEPS
// ============================================================

const LIFECYCLE = [
  { label: "Requirement", desc: "Someone needs goods" },
  { label: "RFQ", desc: "Ask vendors for quotes" },
  { label: "Quotes", desc: "Vendors send prices" },
  { label: "Compare", desc: "Pick the best offer" },
  { label: "Purchase Order", desc: "Confirm the order" },
  { label: "Delivery", desc: "Goods are shipped" },
  { label: "GRN", desc: "Goods received & checked" },
  { label: "Invoice", desc: "Vendor bills you" },
  { label: "Payment", desc: "You pay the vendor" },
];

// ============================================================
// ROLE GUIDES
// ============================================================

interface RoleGuide {
  key: string;
  name: string;
  tagline: string;
  canDo: string[];
  workflow: string[];
  menus: string[];
}

const ROLE_GUIDES: RoleGuide[] = [
  {
    key: "SUPER_ADMIN",
    name: "Super Admin",
    tagline: "Full control of the entire platform.",
    canDo: [
      "Access every module and screen",
      "Manage users, roles and permissions",
      "Set up approval rules",
      "Approve anything at any level",
      "Manage all master data (locations, products, vendors)",
    ],
    workflow: [
      "Set up master data first: Locations, Products and Vendors.",
      "Add your team under Settings → Users and assign each a role.",
      "Configure Settings → Approval Rules so big orders need sign-off.",
      "From then on, monitor everything via the Dashboard and Analytics.",
    ],
    menus: [
      "Everything — all menus are visible to you",
      "Settings (Users, Roles, Approval Rules) is exclusive to you",
    ],
  },
  {
    key: "PROCUREMENT_HEAD",
    name: "Procurement Head",
    tagline: "Owns the procurement function end-to-end.",
    canDo: [
      "Create and approve Requirements and RFQs",
      "Create and approve Purchase Orders",
      "Manage master data and approval rules",
      "Handle deliveries, GRN and invoices",
      "View all analytics and reports",
    ],
    workflow: [
      "Review Requirements raised by the team and approve them.",
      "Approve RFQs before they go out to vendors.",
      "Review quote comparisons and approve the final Purchase Order.",
      "Track spend and savings in Analytics.",
    ],
    menus: [
      "Masters, Procurement, Operations, Finance, Analytics",
      "Approvals — your main daily stop for sign-offs",
    ],
  },
  {
    key: "PROCUREMENT_MANAGER",
    name: "Procurement Manager",
    tagline: "Runs day-to-day buying and first-level approvals.",
    canDo: [
      "Create Requirements, RFQs and Purchase Orders",
      "Approve Requirements (first level)",
      "Manage products and vendors",
      "Handle deliveries and GRN",
      "View analytics",
    ],
    workflow: [
      "Turn approved Requirements into RFQs and send to vendors.",
      "Collect quotes and prepare the comparison.",
      "Raise the Purchase Order for higher approval.",
      "Coordinate delivery and goods receipt.",
    ],
    menus: [
      "Masters (Products, Vendors), Procurement, Operations, Analytics",
      "Approvals — for the requirements you can clear",
    ],
  },
  {
    key: "BUYER",
    name: "Buyer",
    tagline: "Creates the paperwork that drives purchasing.",
    canDo: [
      "Create Requirements, RFQs and Purchase Orders",
      "Manage vendors",
      "Record deliveries and create GRN",
    ],
    workflow: [
      "Raise a Requirement when goods are needed.",
      "Create an RFQ and invite vendors to quote.",
      "Once a quote is approved, generate the Purchase Order.",
      "Record the delivery and complete the GRN when goods arrive.",
    ],
    menus: [
      "Procurement (Requirements, RFQs, Purchase Orders)",
      "Operations (Deliveries, GRN) and Vendors",
    ],
  },
  {
    key: "ACCOUNTS",
    name: "Accounts",
    tagline: "Handles billing, matching and payments.",
    canDo: [
      "Manage Invoices",
      "Record and track Payments",
      "View analytics and reports",
    ],
    workflow: [
      "Open Invoices and check them against the PO and GRN (3-way match).",
      "Flag any mismatch in quantity or price.",
      "Record payments and track what is due.",
      "Use Analytics to watch outstanding amounts and aging.",
    ],
    menus: ["Finance (Invoices, Payments)", "Analytics & Reports"],
  },
  {
    key: "OPERATIONS",
    name: "Operations",
    tagline: "Works on the ground — receiving goods.",
    canDo: [
      "Create Requirements",
      "Manage Deliveries",
      "Create GRN (Goods Receipt Notes)",
    ],
    workflow: [
      "Raise a Requirement when the warehouse needs stock.",
      "Track incoming Deliveries.",
      "When goods arrive, create a GRN and record accepted/rejected quantity.",
    ],
    menus: ["Requirements", "Operations (Deliveries, GRN)"],
  },
  {
    key: "VENDOR",
    name: "Vendor",
    tagline: "Your supplier — uses the separate Vendor Portal.",
    canDo: [
      "View RFQs sent to them and submit quotes",
      "See the quotes they have submitted",
      "View approved Purchase Orders meant for them",
      "Upload invoices against orders",
    ],
    workflow: [
      "Log in and open the Vendor Portal.",
      "Check RFQs and submit your best price for each item.",
      "Once you win an order, view the Purchase Order.",
      "Deliver the goods and upload your invoice.",
    ],
    menus: [
      "Vendor Portal only (RFQs, My Quotes, Orders, Invoices)",
      "Vendors do not see the internal company menus",
    ],
  },
];

// ============================================================
// MODULE / TAB GUIDE
// ============================================================

interface ModuleGuide {
  slug: string;
  icon: React.ElementType;
  name: string;
  accent: string;
  what: string;
  how: string;
}

const MODULES: ModuleGuide[] = [
  {
    slug: "dashboard",
    icon: LayoutDashboard,
    name: "Dashboard",
    accent: "#F47B20",
    what: "Your home screen with a quick overview of activity.",
    how: "See pending counts, recent Purchase Orders and RFQs, and use the quick action buttons to start common tasks.",
  },
  {
    slug: "locations",
    icon: MapPin,
    name: "Masters → Locations",
    accent: "#3b82f6",
    what: "Your company structure: regions, states, cities and warehouses.",
    how: "Add the warehouses you buy for. Every Requirement and PO is tied to a warehouse.",
  },
  {
    slug: "products",
    icon: Package,
    name: "Masters → Products",
    accent: "#8b5cf6",
    what: "The catalogue of items you purchase, organised by category.",
    how: "Add products with their SKU and unit of measure. You'll pick from this list when raising requirements.",
  },
  {
    slug: "categories",
    icon: FolderTree,
    name: "Masters → Categories",
    accent: "#6366f1",
    what: "The Category → Sub-category → Product Group tree your products are organised under.",
    how: "Manage the full tree here, or create entries on the fly with the “+” buttons in the product form.",
  },
  {
    slug: "brands",
    icon: Tag,
    name: "Masters → Brands",
    accent: "#EC4899",
    what: "The brand list products are chosen from (includes 'Local / Non-branded').",
    how: "Add or edit brands here. Brand, Model No. and Size are now mandatory on every product.",
  },
  {
    slug: "vendors",
    icon: Users,
    name: "Masters → Vendors",
    accent: "#10b981",
    what: "Your list of suppliers and the categories they serve.",
    how: "Add vendors (or import in bulk). Link them to categories so the right vendors appear on RFQs.",
  },
  {
    slug: "requirements",
    icon: ClipboardList,
    name: "Requirements",
    accent: "#f59e0b",
    what: "A request for goods — the starting point of every purchase.",
    how: "Click New Requirement, choose the warehouse, add line items (product + quantity) and submit for approval.",
  },
  {
    slug: "rfq",
    icon: FileText,
    name: "RFQs (Request for Quote)",
    accent: "#06b6d4",
    what: "An ask to vendors: 'what's your price for these items?'",
    how: "Create an RFQ from a requirement, select vendors, and send. Compare the quotes that come back side-by-side.",
  },
  {
    slug: "vendor-performance",
    icon: Gauge,
    name: "Vendor Performance",
    accent: "#0d9488",
    what: "A scorecard of how each vendor performs on quotation speed, pricing, delivery and quality.",
    how: "Click “Sync from records” to auto-build the log from quotes & deliveries, add manual rows, and read each vendor's weighted rating.",
  },
  {
    slug: "purchase-orders",
    icon: ShoppingCart,
    name: "Purchase Orders",
    accent: "#ef4444",
    what: "The official order you place with the chosen vendor.",
    how: "Generate a PO from the winning quote (or directly). Once approved, it's shared with the vendor.",
  },
  {
    slug: "deliveries",
    icon: Truck,
    name: "Deliveries",
    accent: "#0ea5e9",
    what: "Tracks goods on the way from vendor to warehouse.",
    how: "Mark orders as dispatched / in-transit / delivered to keep everyone updated.",
  },
  {
    slug: "grn",
    icon: ClipboardCheck,
    name: "GRN (Goods Receipt Note)",
    accent: "#22c55e",
    what: "Confirms what actually arrived and its condition.",
    how: "On arrival, create a GRN against the delivery and record accepted vs rejected quantities.",
  },
  {
    slug: "invoices",
    icon: Receipt,
    name: "Invoices",
    accent: "#a855f7",
    what: "Vendor bills, matched against the PO and GRN.",
    how: "Upload or open an invoice and verify it matches the order and what was received before approving it.",
  },
  {
    slug: "payments",
    icon: CreditCard,
    name: "Payments",
    accent: "#14b8a6",
    what: "Records what you've paid and what's still due.",
    how: "Record payments against approved invoices and track outstanding amounts by age.",
  },
  {
    slug: "approvals",
    icon: ShieldCheck,
    name: "Approvals",
    accent: "#6366f1",
    what: "Your inbox of items waiting for your sign-off.",
    how: "Open it to approve or reject requirements, RFQs and POs that need your decision.",
  },
  {
    slug: "analytics",
    icon: BarChart3,
    name: "Analytics & Reports",
    accent: "#f97316",
    what: "Charts and reports on spend, savings and vendor performance.",
    how: "Filter by period and export to PDF/Excel for reviews.",
  },
  {
    slug: "intelligence",
    icon: Sparkles,
    name: "Procurement Intelligence",
    accent: "#F47B20",
    what: "AI-driven insights from your quotes, POs and price history.",
    how: "Vendor Consolidation flags products bought from many vendors (with est. savings); Price Benchmarking shows lowest/avg/median rates & trend per SKU; Vendor Recommendations rank suppliers for a SKU with the reasons behind each rank. Mark vendors Preferred/Blacklisted on their profile to influence ranking.",
  },
  {
    slug: "settings",
    icon: Settings,
    name: "Settings",
    accent: "#64748b",
    what: "Admin area for users, roles and approval rules.",
    how: "Add team members and assign roles, edit what each role can do, and set value-based approval levels. (Super Admin only.)",
  },
  {
    slug: "vendor-portal",
    icon: Store,
    name: "Vendor Portal",
    accent: "#84cc16",
    what: "A separate, simplified area just for suppliers.",
    how: "Vendors log in here to answer RFQs, submit quotes, view approved orders and upload invoices.",
  },
];

// ============================================================
// FAQ
// ============================================================

const FAQS = [
  {
    q: "What is the right order to do things in?",
    a: "Requirement → RFQ → Compare quotes → Purchase Order → Delivery → GRN → Invoice → Payment. The Quick Start strip at the top shows this flow.",
  },
  {
    q: "How does Procurement Intelligence work?",
    a: "It analyses the data you already capture — vendor rates, quotes, purchase orders and price history — to surface consolidation opportunities, price benchmarks and ranked vendor recommendations. It is not a guess: every recommendation lists the reasons behind it. The more quotes, POs and vendor rates you record, the sharper it gets.",
  },
  {
    q: "Why is an Intelligence report empty?",
    a: "The reports need historical data. Add vendors + rates on product pages, and record quotes/POs — rows appear automatically as data accumulates. Vendor Consolidation only lists products bought from 2+ vendors.",
  },
  {
    q: "Why can't I see a certain menu?",
    a: "Menus appear based on your role. If you need access to something you can't see, ask your Super Admin to update your role under Settings → Roles.",
  },
  {
    q: "I picked a warehouse/product but it shows a code — is that wrong?",
    a: "No. Dropdowns now show the readable name. If you ever see a code, just reopen the dropdown and re-select; the name will display.",
  },
  {
    q: "How do I add my team members?",
    a: "Super Admin: go to Settings → Users → Add User, enter their details and choose a role. They can then log in with the credentials you set.",
  },
  {
    q: "How do approvals work?",
    a: "Larger orders require sign-off based on the rules in Settings → Approval Rules. Approvers see pending items under the Approvals menu.",
  },
  {
    q: "How do vendors use the system?",
    a: "Vendors log in to the separate Vendor Portal. They only see RFQs sent to them, their submitted quotes, and approved orders/invoices — never your internal data.",
  },
  {
    q: "Can I save work and finish later?",
    a: "Yes. Forms like Requirements let you Save as Draft and submit when you're ready.",
  },
  {
    q: "What is a 3-way match on invoices?",
    a: "It means the Invoice is checked against the Purchase Order (what you ordered) and the GRN (what you received) so you only pay for correct, delivered goods.",
  },
];

// ============================================================
// PAGE
// ============================================================

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeRole, setActiveRole] = useState<string>(ROLE_GUIDES[0].key);
  const role = ROLE_GUIDES.find((r) => r.key === activeRole) ?? ROLE_GUIDES[0];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Help & FAQ"
        description="A simple guide to using NOW-BUY — by role, by screen, and answers to common questions."
      />

      {/* Quick Start lifecycle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Quick Start — how procurement flows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-stretch gap-2">
            {LIFECYCLE.map((step, i) => (
              <div key={step.label} className="flex items-stretch gap-2">
                <div className="flex w-32 flex-col rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1B2A4A] text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold">{step.label}</span>
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {step.desc}
                  </span>
                </div>
                {i < LIFECYCLE.length - 1 && (
                  <div className="hidden items-center text-muted-foreground sm:flex">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Guide by role */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guide by your role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_GUIDES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setActiveRole(r.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  activeRole === r.key
                    ? "bg-[#1B2A4A] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                )}
              >
                {r.name}
              </button>
            ))}
          </div>

          <div className="pt-5">
            <p className="mb-4 text-sm text-muted-foreground">{role.tagline}</p>
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#F47B20]">
                  What you can do
                </h4>
                <ul className="space-y-1.5">
                  {role.canDo.map((c) => (
                    <li key={c} className="flex gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#F47B20]">
                  Your typical workflow
                </h4>
                <ol className="space-y-1.5">
                  {role.workflow.map((w, i) => (
                    <li key={w} className="flex gap-2 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold">
                        {i + 1}
                      </span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#F47B20]">
                  Menus you'll use
                </h4>
                <ul className="space-y-1.5">
                  {role.menus.map((m) => (
                    <li key={m} className="text-sm text-muted-foreground">
                      • {m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            What each menu does
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <div
                key={m.name}
                id={`help-${m.slug}`}
                className="scroll-mt-20 rounded-lg border p-4 transition-colors target:border-[#F47B20] target:ring-2 target:ring-[#F47B20]/30 hover:bg-muted/30"
              >
                <div className="mb-2 flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${m.accent}1a`, color: m.accent }}
                  >
                    <m.icon className="size-4" />
                  </span>
                  <span className="text-sm font-semibold">{m.name}</span>
                </div>
                <p className="text-sm font-medium">{m.what}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.how}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Frequently asked questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {FAQS.map((f, i) => (
              <div key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-3 text-left"
                >
                  <span className="text-sm font-medium">{f.q}</span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <p className="pb-3 text-sm text-muted-foreground">{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Need more help? Contact your Super Admin or the Warehouse Now team.
      </p>
    </div>
  );
}
