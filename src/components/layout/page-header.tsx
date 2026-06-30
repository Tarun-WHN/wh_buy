"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";

// Maps a route prefix to the matching anchor in the Help & FAQ page
// (the `help-<slug>` ids on the "What each menu does" cards).
// Ordered most-specific first.
const HELP_TOPICS: [string, string][] = [
  ["/masters/locations", "locations"],
  ["/masters/products", "products"],
  ["/masters/categories", "categories"],
  ["/masters/vendors", "vendors"],
  ["/masters", "products"],
  ["/requirements", "requirements"],
  ["/rfq", "rfq"],
  ["/vendor-performance", "vendor-performance"],
  ["/purchase-orders", "purchase-orders"],
  ["/delivery", "deliveries"],
  ["/grn", "grn"],
  ["/invoices", "invoices"],
  ["/payments", "payments"],
  ["/approvals", "approvals"],
  ["/analytics", "analytics"],
  ["/reports", "analytics"],
  ["/settings", "settings"],
  ["/vendor-portal", "vendor-portal"],
  ["/dashboard", "dashboard"],
];

function helpSlugForPath(pathname: string): string | null {
  for (const [prefix, slug] of HELP_TOPICS) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return slug;
  }
  return null;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  const pathname = usePathname();
  const slug = pathname.startsWith("/help") ? null : helpSlugForPath(pathname);

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {slug && (
            <Link
              href={`/help#help-${slug}`}
              title="Help for this page"
              aria-label="Help for this page"
              className="flex size-5 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
            >
              <HelpCircle className="size-[18px]" />
            </Link>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
