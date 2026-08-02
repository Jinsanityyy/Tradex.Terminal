import React from "react";
import { cn } from "@/lib/utils";

/**
 * Persistent disclaimer shown near any agent-read output.
 *
 * The agent committee produces a descriptive market read, not a trade
 * instruction — this label has to travel with the read wherever it renders
 * (dashboard, brain panels, mobile, drawers).
 */
export const AGENT_READ_DISCLAIMER =
  "For informational purposes only. Not trading advice. Reflects rule-based logic, not a live AI model.";

export function AgentReadDisclaimer({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "compact";
}) {
  return (
    <p
      className={cn(
        "leading-snug text-zinc-500",
        variant === "compact" ? "text-[9px]" : "text-[10px]",
        className
      )}
    >
      {AGENT_READ_DISCLAIMER}
    </p>
  );
}
