import { BrainTerminal } from "@/components/brain/BrainTerminal";

export const metadata = { title: "TradeX Terminal" };

export default function BrainPage() {
  return (
    <div className="h-full min-h-0 overflow-y-auto pb-6 pr-1">
      <BrainTerminal />
    </div>
  );
}
