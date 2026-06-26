import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { VendorSidebar } from "./vendor-sidebar";
import { VendorTopbar } from "./vendor-topbar";

export default async function VendorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "VENDOR") {
    redirect("/dashboard");
  }

  const { name, role } = session.user;

  return (
    <div className="flex h-screen overflow-hidden">
      <VendorSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <VendorTopbar userName={name} userRole={role} />
        <main className="flex-1 overflow-y-auto bg-[#FFF8F3] p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
