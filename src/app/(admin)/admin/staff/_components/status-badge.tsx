import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { STATUS_LABELS, type StaffStatus } from "../status";

export function StaffStatusBadge({ status }: { status: StaffStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        status === "inactive" && "text-muted-foreground",
        status === "invited" && "border-accent/40 text-accent",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          status === "active" && "bg-success",
          status === "inactive" && "bg-muted-foreground",
          status === "invited" && "bg-accent",
        )}
      />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
