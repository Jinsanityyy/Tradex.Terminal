import { CandleChart } from "@/components/shared/CandleChart";

export default function CandleAnalysisPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden p-4 md:p-6">
      <div className="mb-3 shrink-0">
        <h1 className="text-[16px] font-bold text-zinc-200">Candle Analysis</h1>
        <p className="text-[11px] text-zinc-500 mt-0.5">Click any candle to explain why it moved</p>
      </div>
      <div className="flex-1 min-h-0">
        <CandleChart />
      </div>
    </div>
  );
}
