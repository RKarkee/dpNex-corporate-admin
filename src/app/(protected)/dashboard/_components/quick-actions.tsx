import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

const actions = [
  { label: "New Shipment", variant: "default" as const },
  { label: "Track Package", variant: "outline" as const },
  { label: "Generate Report", variant: "crimson" as const },
  { label: "Manage Clients", variant: "orange" as const },
];

export function QuickActions() {
  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold tracking-tight text-foreground">
        Quick Actions
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <Button key={action.label} variant={action.variant} size="lg">
            {action.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
