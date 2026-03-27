"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketNarrativePanel } from "@/components/shared/MarketNarrativePanel";
import { TradeContextBox } from "@/components/shared/TradeContextBox";
import { useMarketAnalysis, useSessions, useNews } from "@/hooks/useMarketData";
import { BrainCircuit, Sparkles, Clock, Loader2, RefreshCw, TrendingUp, AlertTriangle, Shield } from "lucide-react";

export default function AIBriefingPage() {
  const { narrative, tradeContext, sentiment, generatedAt, isLive, isLoading: analysisLoading, generateFresh } = useMarketAnalysis(120_000);
  const { sessions, isLive: sessionsLive } = useSessions(120_000);
  const { news, isLive: newsLive } = useNews(120_000);
  const [generating, setGenerating] = React.useState(false);

  const activeSession = sessions.find(s => s.status === "active");

  const handleGenerate = async () => {
    setGenerating(true);
    try { await generateFresh(); } catch { /* ignore */ }
    setGenerating(false);
  };

  // Build dynamic briefings from live data
  const briefings = React.useMemo(() => {
    const items: { id: string; title: string; icon: React.ReactNode; content: string; type: string }[] = [];

    // Market Overview Briefing
    items.push({
      id: "overview",
      title: "Market Overview",
      icon: <TrendingUp className="h-4 w-4 text-[hsl(var(--primary))]" />,
      type: "overview",
      content: narrative.summary || "Awaiting market data...",
    });

    // Active Session Briefing
    if (activeSession) {
      const sessionLabel = activeSession.session === "new-york" ? "New York" : activeSession.session.charAt(0).toUpperCase() + activeSession.session.slice(1);
      items.push({
        id: "session",
        title: `${sessionLabel} Session Brief`,
        icon: <Clock className="h-4 w-4 text-blue-400" />,
        type: "session",
        content: [
          activeSession.whatChanged || "",
          activeSession.liquidityNotes || "",
          activeSession.keyMoves.length > 0 ? `Key moves: ${activeSession.keyMoves.join(". ")}` : "",
        ].filter(Boolean).join(" "),
      });
    }

    // Risk Assessment
    items.push({
      id: "risk",
      title: "Risk Assessment",
      icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
      type: "risk",
      content: tradeContext.cautionFactors.join(". ") + ".",
    });

    // Trading Mindset
    items.push({
      id: "mindset",
      title: "Trading Mindset",
      icon: <Shield className="h-4 w-4 text-purple-400" />,
      type: "mindset",
      content: tradeContext.idealMindset || "Awaiting analysis...",
    });

    return items;
  }, [narrative, tradeContext, activeSession]);

  // Top news headlines
  const topHeadlines = news.slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-[hsl(var(--primary))]" />
            AI Briefing
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Live intelligence briefings — session-based analysis and trade context
            {generatedAt && (
              <span className="ml-2 text-[hsl(var(--muted-foreground))]/70">
                Updated: {new Date(generatedAt).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-md bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {generating ? "Generating..." : "Generate Fresh"}
          </button>
          <Badge variant={isLive ? "bullish" : "outline"} className="gap-1">
            <Sparkles className="h-3 w-3" />
            {isLive ? "LIVE" : "LOADING"}
          </Badge>
        </div>
      </div>

      {/* Sentiment Banner */}
      <Card className={`border-${sentiment === "risk-off" ? "red-500/30" : sentiment === "risk-on" ? "[hsl(var(--primary))]/30" : "amber-500/30"}`}>
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${sentiment === "risk-off" ? "bg-red-500" : sentiment === "risk-on" ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
            <div>
              <p className="text-xs font-semibold text-[hsl(var(--foreground))]">
                Market Sentiment: <span className={sentiment === "risk-off" ? "text-red-400" : sentiment === "risk-on" ? "text-emerald-400" : "text-amber-400"}>{sentiment.toUpperCase().replace("-", " ")}</span>
              </p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                Regime: {narrative.regime?.replace(/-/g, " ")} | Theme: {narrative.dominantTheme} | Conviction: {narrative.conviction}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Narrative + Context */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <MarketNarrativePanel narrative={narrative} />
        <TradeContextBox context={tradeContext} />
      </div>

      {/* Live Briefings */}
      <div className="space-y-3">
        {briefings.map((brief) => (
          <Card key={brief.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                {brief.icon}
                {brief.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{brief.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Headlines */}
      {topHeadlines.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Latest Headlines
              {newsLive && <Badge variant="bullish" className="text-[9px] py-0">LIVE</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topHeadlines.map((item, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md bg-[hsl(var(--secondary))] p-2">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    item.sentiment === "bullish" ? "bg-emerald-500/20 text-emerald-400" :
                    item.sentiment === "bearish" ? "bg-red-500/20 text-red-400" :
                    "bg-zinc-500/20 text-zinc-400"
                  }`}>
                    {item.sentiment?.toUpperCase() || "NEUTRAL"}
                  </span>
                  <p className="text-xs text-[hsl(var(--foreground))] flex-1">{item.headline}</p>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] shrink-0">
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
