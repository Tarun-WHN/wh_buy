import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  accent?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  accent,
}: StatsCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 w-1 rounded-l-lg"
        style={{ backgroundColor: accent || "#1B2A4A" }}
      />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {description && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {trend === "up" && (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                )}
                {trend === "down" && (
                  <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                )}
                {trend === "neutral" && (
                  <Minus className="h-3.5 w-3.5 text-muted-foreground/60" />
                )}
                <span
                  className={cn(
                    trend === "up" && "text-emerald-600",
                    trend === "down" && "text-red-600"
                  )}
                >
                  {description}
                </span>
              </div>
            )}
          </div>
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: (accent || "#1B2A4A") + "15" }}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: accent || "#1B2A4A" }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
