"use client";

import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";

export function usePermissions() {
  const { data: session } = useSession();

  const role = session?.user?.role ?? "";

  return {
    can: (permission: string) => hasPermission(role, permission),
    role,
    user: session?.user ?? null,
  };
}
