"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronRight, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";

interface TopbarProps {
  userName: string;
  userRole: string;
}

function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    breadcrumbs.push({ label, href: currentPath });
  }

  return breadcrumbs;
}

function formatRole(role: string) {
  return role
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function Topbar({ userName, userRole }: TopbarProps) {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4 md:px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3 w-3" />}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#F47B20] p-0 text-[10px] text-white border-2 border-white">
              3
            </Badge>
          </Button>
        </Link>

        {/* Separator */}
        <div className="h-6 w-px bg-border mx-1 hidden md:block" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="flex items-center gap-2.5 px-2 rounded-lg"
              />
            }
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#1B2A4A] text-xs text-white font-semibold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start md:flex">
              <span className="text-sm font-semibold leading-tight">{userName}</span>
              <span className="text-[11px] text-muted-foreground leading-tight">
                {formatRole(userRole)}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              render={<Link href="/settings/profile" />}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/settings/users" />}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
