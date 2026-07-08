"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  Package,
  FolderTree,
  Tag,
  Users,
  FileText,
  ShoppingCart,
  ClipboardList,
  Gauge,
  FolderKanban,
  Truck,
  ClipboardCheck,
  Flag,
  Receipt,
  CreditCard,
  BarChart3,
  FileBarChart,
  Sparkles,
  CloudUpload,
  Bot,
  Wand2,
  FileSignature,
  ShieldCheck,
  Settings,
  UserCog,
  Lock,
  Menu,
  HelpCircle,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Masters",
    items: [
      {
        label: "Locations",
        href: "/masters/locations",
        icon: MapPin,
        permission: PERMISSIONS.LOCATION_MANAGE,
      },
      {
        label: "Products",
        href: "/masters/products",
        icon: Package,
        permission: PERMISSIONS.PRODUCT_MANAGE,
      },
      {
        label: "Categories",
        href: "/masters/categories",
        icon: FolderTree,
        permission: PERMISSIONS.PRODUCT_MANAGE,
      },
      {
        label: "Brands",
        href: "/masters/brands",
        icon: Tag,
        permission: PERMISSIONS.PRODUCT_MANAGE,
      },
      {
        label: "Vendors",
        href: "/masters/vendors",
        icon: Users,
        permission: PERMISSIONS.VENDOR_MANAGE,
      },
    ],
  },
  {
    label: "Procurement",
    items: [
      {
        label: "Requirements",
        href: "/requirements",
        icon: ClipboardList,
        permission: PERMISSIONS.REQUIREMENT_CREATE,
      },
      {
        label: "RFQs",
        href: "/rfq",
        icon: FileText,
        permission: PERMISSIONS.RFQ_CREATE,
      },
      {
        label: "Vendor Performance",
        href: "/vendor-performance",
        icon: Gauge,
        permission: PERMISSIONS.VENDOR_MANAGE,
      },
      {
        label: "Purchase Orders",
        href: "/purchase-orders",
        icon: ShoppingCart,
        permission: PERMISSIONS.PO_CREATE,
      },
      {
        label: "Projects",
        href: "/projects",
        icon: FolderKanban,
        permission: PERMISSIONS.PO_CREATE,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Deliveries",
        href: "/delivery",
        icon: Truck,
        permission: PERMISSIONS.DELIVERY_MANAGE,
      },
      {
        label: "GRN",
        href: "/grn",
        icon: ClipboardCheck,
        permission: PERMISSIONS.GRN_CREATE,
      },
      {
        label: "Quality & Claims",
        href: "/quality",
        icon: Flag,
        permission: PERMISSIONS.GRN_CREATE,
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Invoices",
        href: "/invoices",
        icon: Receipt,
        permission: PERMISSIONS.INVOICE_MANAGE,
      },
      {
        label: "Payments",
        href: "/payments",
        icon: CreditCard,
        permission: PERMISSIONS.PAYMENT_MANAGE,
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        label: "AI Copilot",
        href: "/copilot",
        icon: Bot,
        permission: PERMISSIONS.ANALYTICS_VIEW,
      },
      {
        label: "Procurement",
        href: "/analytics/procurement",
        icon: BarChart3,
        permission: PERMISSIONS.ANALYTICS_VIEW,
      },
      {
        label: "Reports",
        href: "/reports",
        icon: FileBarChart,
        permission: PERMISSIONS.ANALYTICS_VIEW,
      },
      {
        label: "Procurement Intelligence",
        href: "/intelligence",
        icon: Sparkles,
        permission: PERMISSIONS.ANALYTICS_VIEW,
      },
      {
        label: "Bill / Price Import",
        href: "/bill-import",
        icon: CloudUpload,
        permission: PERMISSIONS.VENDOR_MANAGE,
      },
      {
        label: "AI Product Tools",
        href: "/ai-tools",
        icon: Wand2,
        permission: PERMISSIONS.PRODUCT_MANAGE,
      },
      {
        label: "Contract Analyzer",
        href: "/contracts",
        icon: FileSignature,
        permission: PERMISSIONS.VENDOR_MANAGE,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Users",
        href: "/settings/users",
        icon: UserCog,
        permission: PERMISSIONS.USER_MANAGE,
      },
      {
        label: "Roles",
        href: "/settings/roles",
        icon: Lock,
        permission: PERMISSIONS.USER_MANAGE,
      },
      {
        label: "Approval Rules",
        href: "/settings/approval-rules",
        icon: Settings,
        permission: PERMISSIONS.APPROVAL_RULES_MANAGE,
      },
    ],
  },
];

function SidebarContent({
  role,
  collapsed,
  onToggle,
}: {
  role: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      NAV_GROUPS.forEach((group) => {
        const isActive = group.items.some((item) =>
          pathname.startsWith(item.href)
        );
        if (isActive) initial[group.label] = true;
      });
      return initial;
    }
  );

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function filterItems(items: NavItem[]) {
    return items.filter(
      (item) => !item.permission || hasPermission(role, item.permission)
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#1B2A4A]">
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-white/8 px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F47B20]">
              <span className="text-sm font-bold text-white">N</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              NOW-BUY
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F47B20]">
              <span className="text-sm font-bold text-white">N</span>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          className="text-white/50 hover:bg-white/8 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-0.5 px-2">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              isActive("/dashboard")
                ? "bg-[#F47B20] text-white shadow-sm"
                : "text-white/65 hover:bg-white/8 hover:text-white"
            )}
            title={collapsed ? "Dashboard" : undefined}
          >
            <LayoutDashboard className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </Link>

          {/* Groups */}
          {NAV_GROUPS.map((group) => {
            const visibleItems = filterItems(group.items);
            if (visibleItems.length === 0) return null;

            const isExpanded = expandedGroups[group.label] ?? false;
            const groupActive = visibleItems.some((item) =>
              isActive(item.href)
            );

            return (
              <div key={group.label} className="mt-3">
                {!collapsed ? (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                      groupActive
                        ? "text-[#F47B20]"
                        : "text-white/40 hover:text-white/60"
                    )}
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>
                ) : (
                  <div className="mx-auto my-2 h-px w-5 bg-white/15" />
                )}

                {(isExpanded || collapsed) &&
                  visibleItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        !collapsed && "ml-1",
                        isActive(item.href)
                          ? "bg-white/12 text-white"
                          : "text-white/55 hover:bg-white/8 hover:text-white"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  ))}
              </div>
            );
          })}

          {/* Approvals */}
          <div className="mt-3">
            <div className="mx-auto my-2 h-px w-full bg-white/8 mx-2" />
            <Link
              href="/approvals"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive("/approvals")
                  ? "bg-white/12 text-white"
                  : "text-white/55 hover:bg-white/8 hover:text-white"
              )}
              title={collapsed ? "Approvals" : undefined}
            >
              <ShieldCheck className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>Approvals</span>}
            </Link>
          </div>

          {/* Help & FAQ — visible to everyone */}
          <div className="mt-1">
            <Link
              href="/help"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive("/help")
                  ? "bg-white/12 text-white"
                  : "text-white/55 hover:bg-white/8 hover:text-white"
              )}
              title={collapsed ? "Help & FAQ" : undefined}
            >
              <HelpCircle className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>Help &amp; FAQ</span>}
            </Link>
          </div>
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-white/8 px-4 py-3">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <p className="text-[11px] text-white/35 font-medium">
              Warehouse Now
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ role }: { role: string }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-screen flex-shrink-0 transition-all duration-200 md:block",
          collapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        <SidebarContent
          role={role}
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
        <SheetContent side="left" className="w-[240px] p-0">
          <SidebarContent
            role={role}
            collapsed={false}
            onToggle={() => {}}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
