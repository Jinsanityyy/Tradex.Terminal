import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public endpoint — no auth required.
// Used by the Android home-screen widget to display live market data.
export async function GET(request: Request) {
  // Allow CORS so the widget's HttpURLConnection can read it
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  };

  try {
    const base = new URL(request.url).origin;
    const res = await fetch(`${base}/api/market/quotes`, { cache: "no-store" });
    if (!res.ok) throw new Error("quotes failed");

    const quotes: any[] = await res.json();

    const WANT = [
      { sym: "XAU/USD", label: "GOLD" },
      { sym: "USD/DXY", label: "DXY"  },
      { sym: "BTC/USD", label: "BTC"  },
      { sym: "EUR/USD", label: "EUR"  },
    ];

    const prices = WANT.map(({ sym, label }) => {
      const q = quotes.find(
        (q: any) => q.symbol === sym || q.symbol === sym.replace("/", "")
      );
      if (!q) return { label, price: "---", change: "0.00%", positive: true };

      const raw   = parseFloat(q.price ?? q.close ?? 0);
      const pct   = parseFloat(q.changePercent ?? q.percentChange ?? q.change ?? 0);
      const price = raw > 1000
        ? raw.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : raw.toFixed(raw < 10 ? 4 : 2);

      return {
        label,
        price,
        change:   `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
        positive: pct >= 0,
      };
    });

    return NextResponse.json({ prices }, { headers });
  } catch {
    return NextResponse.json(
      { prices: [
        { label: "GOLD", price: "---", change: "-.---%", positive: true },
        { label: "DXY",  price: "---", change: "-.---%", positive: true },
        { label: "BTC",  price: "---", change: "-.---%", positive: true },
        { label: "EUR",  price: "---", change: "-.---%", positive: true },
      ]},
      { status: 200, headers }
    );
  }
}
