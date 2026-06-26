"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRight, LogOut, User } from "lucide-react";
import Link from "next/link";

interface VendorTopbarProps {
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

export function VendorTopbar({ userName, userRole }: VendorTopbarProps) {
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
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2"
              />
            }
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-[#F47B20] text-xs text-white">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start md:flex">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-xs text-muted-foreground">
                {userRole.replace(/_/g, " ")}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              render={<Link href="/vendor-portal/profile" />}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Profile
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
