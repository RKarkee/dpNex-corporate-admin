import { Card } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

export type StatTone = "navy" | "crimson" | "orange";

const toneClass: Record<StatTone, string> = {
  navy: "text-primary",
  crimson: "text-brand-crimson",
  orange: "text-brand-orange",
};

interface StatCardProps {
  label: string;
  value: string | number;
  hint: string;
  tone?: StatTone;
}

export function StatCard({ label, value, hint, tone = "navy" }: StatCardProps) {
  return (
    <Card className="p-6">
      <p className={cn("text-sm font-semibold", toneClass[tone])}>{label}</p>
      <p className="mt-4 text-4xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">{hint}</p>
    </Card>
  );
}
