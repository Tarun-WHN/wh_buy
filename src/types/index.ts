import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      roleId: string;
      warehouseId: string | null;
      vendorId: string | null;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    roleId: string;
    warehouseId: string | null;
    vendorId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    roleId: string;
    warehouseId: string | null;
    vendorId: string | null;
  }
}

// ============================================================
// SHARED TYPES
// ============================================================

export interface PageProps {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
