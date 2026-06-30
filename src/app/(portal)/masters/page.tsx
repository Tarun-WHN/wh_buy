import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { MapPin, Package, FolderTree, Users, ArrowRight } from "lucide-react";

const SECTIONS = [
  {
    title: "Locations",
    description: "Manage your company, regions, states, cities and warehouses",
    href: "/masters/locations",
    icon: MapPin,
    accent: "#3B82F6",
  },
  {
    title: "Products",
    description: "Manage categories, product groups and SKUs with version control",
    href: "/masters/products",
    icon: Package,
    accent: "#8B5CF6",
  },
  {
    title: "Categories",
    description: "Manage product categories, sub-categories and groups",
    href: "/masters/categories",
    icon: FolderTree,
    accent: "#10B981",
  },
  {
    title: "Vendors",
    description: "Manage vendor profiles, contacts and product mappings",
    href: "/masters/vendors",
    icon: Users,
    accent: "#F47B20",
  },
];

export default function MastersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data"
        description="Manage your organization's core reference data"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 w-1 rounded-l-lg"
                style={{ backgroundColor: section.accent }}
              />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: section.accent + "15" }}
                  >
                    <section.icon
                      className="h-5 w-5"
                      style={{ color: section.accent }}
                    />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <CardTitle className="mt-4 text-base">{section.title}</CardTitle>
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
