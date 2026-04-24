"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, ArrowRight, Radio, CheckCircle2 } from "lucide-react";
import type { SessionSummary } from "@/types";

interface SessionSummaryCardProps {
  session: SessionSummary;
  compact?: boolean;
}

export function SessionSummaryCard({ session, compact = false }: SessionSummaryCardProps) {
  const sessionConfig: Record<string, { label: string; color: string }> = {
    asia: { label: "Asia / Tokyo", color: "text-purple-400" },
    london: { label: "London", color: "text-blue-400" },
    "new-york": { label: "New York", color: "text-amber-400" },
    closed: { label: "Closed", color: "text-[hsl(var(--muted-foreground))]" },
  };

  const config = sessionConfig[session.session];
  const StatusIcon = session.status === "active" ? Radio : session.status === "closed" ? CheckCircle2 : Clock;

  return (
    <Card className={cn(
      "transition-all",
      session.status === "active" && "border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/[0.02]"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn(
              "h-4 w-4",
              session.status === "active" ? "text-[hsl(var(--primary))] pulse-live" : "text-[hsl(var(--muted-foreground))]"
            )} />
            <span className={config.color}>{config.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={
              session.volatilityTone === "high" ? "high" :
              session.volatilityTone === "moderate" ? "medium" : "low"
            }>
              {session.volatilityTone} vol
            </Badge>
            <Badge variant={session.status === "active" ? "bullish" : "outline"}>
              {session.status}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Key Moves */}
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">Key Moves</h4>
          <ul className="space-y-1">
            {(compact ? session.keyMoves.slice(0, 1) : session.keyMoves).map((move, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{move}</span>
              </li>
            ))}
          </ul>
        </div>

        {!compact && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <h4 className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">What Changed</h4>
                <p className="text-[11px] text-[hsl(var(--foreground))]">{session.whatChanged}</p>
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">Carries Forward</h4>
                <p className="text-[11px] text-[hsl(var(--foreground))]">{session.carriesForward}</p>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">Liquidity</h4>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{session.liquidityNotes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
