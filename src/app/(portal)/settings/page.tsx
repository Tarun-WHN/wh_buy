import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UserCog,
  Shield,
  Settings,
  User,
  ArrowRight,
} from "lucide-react";

const SETTINGS_SECTIONS = [
  {
    title: "Users",
    description: "Manage user accounts, assign roles and warehouses",
    href: "/settings/users",
    icon: UserCog,
  },
  {
    title: "Roles & Permissions",
    description: "Configure role-based access control and permissions",
    href: "/settings/roles",
    icon: Shield,
  },
  {
    title: "Approval Rules",
    description: "Set up approval workflows and amount thresholds",
    href: "/settings/approval-rules",
    icon: Settings,
  },
  {
    title: "My Profile",
    description: "Update your personal information and password",
    href: "/settings/profile",
    icon: User,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and system configuration"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {SETTINGS_SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription className="mt-1">
                  {section.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
