import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const { name, role } = session.user;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar userName={name} userRole={role} />
        <main className="flex-1 overflow-y-auto bg-[#F9FAFB] p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
