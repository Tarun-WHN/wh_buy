"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  ChevronLeft,
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Receipt,
  User,
  Menu,
} from "lucide-react";

// ============================================================
// NAV ITEMS
// ============================================================

const NAV_ITEMS = [
  { label: "Dashboard", href: "/vendor-portal/dashboard", icon: LayoutDashboard },
  { label: "RFQs", href: "/vendor-portal/rfqs", icon: FileText },
  { label: "Orders", href: "/vendor-portal/orders", icon: ShoppingCart },
  { label: "Invoices", href: "/vendor-portal/invoices", icon: Receipt },
  { label: "Profile", href: "/vendor-portal/profile", icon: User },
];

// ============================================================
// SIDEBAR CONTENT
// ============================================================

function SidebarContent({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/vendor-portal/dashboard") return pathname === "/vendor-portal/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-full flex-col bg-[#1B2A4A] text-white">
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        {!collapsed && (
          <Link
            href="/vendor-portal/dashboard"
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F47B20]">
              <span className="text-sm font-bold text-white">N</span>
            </div>
            <span className="text-lg font-bold tracking-tight">NOW-BUY</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/vendor-portal/dashboard" className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F47B20]">
              <span className="text-sm font-bold text-white">N</span>
            </div>
          </Link>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className="text-white/70 hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Vendor Portal Badge */}
      {!collapsed && (
        <div className="mx-3 mt-3 rounded-md bg-[#F47B20]/20 px-3 py-1.5 text-center">
          <span className="text-xs font-semibold text-[#F47B20]">
            Vendor Portal
          </span>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-[#F47B20]/20 text-[#F47B20]"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-3">
        {!collapsed && (
          <p className="text-xs text-white/40">Warehouse Now</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// VENDOR SIDEBAR
// ============================================================

export function VendorSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-screen flex-shrink-0 transition-all duration-200 md:block",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-4 top-3 z-40 md:hidden"
            />
          }
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <SidebarContent collapsed={false} onToggle={() => {}} />
        </SheetContent>
      </Sheet>
    </>
  );
}
