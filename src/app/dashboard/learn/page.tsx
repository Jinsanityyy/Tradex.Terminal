import { TradingKnowledgePanel } from "@/components/shared/TradingKnowledgePanel";

export const metadata = { title: "Trading Knowledge — TradeX" };

export default function LearnPage() {
  return (
    <div className="h-full min-h-0 overflow-y-auto pb-6 pr-1">
      <div className="max-w-sm mx-auto pt-4 h-full">
        <TradingKnowledgePanel />
      </div>
    </div>
  );
}
