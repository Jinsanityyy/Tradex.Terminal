"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

interface SupportInvalidationCardProps {
  type: "support" | "invalidation";
  items: string[];
}

export function SupportInvalidationCard({ type, items }: SupportInvalidationCardProps) {
  const isSupport = type === "support";

  return (
    <Card className={cn(
      "border",
      isSupport
        ? "border-emerald-500/20 bg-emerald-500/[0.03]"
        : "border-red-500/20 bg-red-500/[0.03]"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          {isSupport ? (
            <>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400">What Supports the Bias</span>
            </>
          ) : (
            <>
              <ShieldAlert className="h-4 w-4 text-red-400" />
              <span className="text-red-400">What Could Change the Bias</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              {isSupport ? (
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500/60" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-500/60" />
              )}
              <span className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
