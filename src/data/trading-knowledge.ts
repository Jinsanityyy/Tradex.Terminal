export interface KnowledgeItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  tags?: string[];
}

export interface KnowledgeCategory {
  id: string;
  label: string;
  icon: string;
  items: KnowledgeItem[];
}

export const TRADING_KNOWLEDGE: KnowledgeCategory[] = [
  {
    id: "basics",
    label: "Basics",
    icon: "BookOpen",
    items: [
      {
        id: "what-is-trading",
        title: "What is Trading?",
        summary: "Buying and selling financial assets to profit from price movements.",
        content: `Trading is the act of buying and selling financial instruments — such as currencies, stocks, commodities, or indices — with the goal of making a profit from price changes.

**Types of Traders:**
- **Scalper** — holds trades for seconds to minutes, targets small moves
- **Day Trader** — opens and closes all trades within the same day
- **Swing Trader** — holds trades from a few days to weeks
- **Position Trader** — holds trades for weeks to months based on macro trends

**Key Markets:**
- **Forex** — currency pairs (EUR/USD, GBP/JPY, etc.)
- **Crypto** — digital assets (BTC, ETH, etc.)
- **Indices** — baskets of stocks (S&P 500, NASDAQ, etc.)
- **Commodities** — physical goods (Gold, Oil, Silver)
- **Stocks** — shares in individual companies`,
        tags: ["intro", "beginner"],
      },
      {
        id: "bid-ask-spread",
        title: "Bid, Ask & Spread",
        summary: "The two prices every market has — and the cost between them.",
        content: `Every tradable market has two prices at any given time:

- **Bid** — the price buyers are willing to pay (you sell here)
- **Ask** — the price sellers are willing to accept (you buy here)
- **Spread** — the difference between bid and ask; this is the broker's cut

**Example:**
EUR/USD Bid: 1.08500 | Ask: 1.08503 → Spread = 0.3 pips

A tighter spread means lower trading cost. Liquid pairs like EUR/USD and major indices have tighter spreads. Exotic pairs have wider spreads.

**Tip:** Always account for spread when setting your take-profit and stop-loss targets.`,
        tags: ["beginner", "costs"],
      },
      {
        id: "order-types",
        title: "Order Types",
        summary: "Market, limit, stop — and how each fills your trade.",
        content: `Understanding order types is essential for precise trade execution.

**Market Order**
Executes immediately at the current best available price. Fast but you accept whatever price the market gives.

**Limit Order**
Executes only at your specified price or better. Buy limit = below market; Sell limit = above market. Used to enter at key levels without chasing.

**Stop Order (Stop Market)**
Triggers a market order once price reaches your stop level. Used to enter breakouts or cut losses. Becomes a market order on trigger — can slip in fast markets.

**Stop-Limit Order**
Like a stop order but converts to a limit order instead of market. More precise but risks not filling in fast moves.

**Trailing Stop**
A stop that moves with price in your favour by a set distance. Locks in profit as the trade runs.`,
        tags: ["beginner", "execution"],
      },
      {
        id: "leverage-margin",
        title: "Leverage & Margin",
        summary: "Trading bigger than your account — and why it's a double-edged sword.",
        content: `**Leverage** allows you to control a larger position than your actual capital. A 1:100 leverage means $1,000 can control a $100,000 position.

**Margin** is the collateral required to open and hold a leveraged position.

**Example:**
- Account: $1,000
- Leverage: 1:100
- You can open a position of up to $100,000
- Margin required: 1% of $100,000 = $1,000

**Margin Call:** If losses eat into your margin below the broker's minimum, positions are automatically closed.

**Warning:** High leverage amplifies both gains AND losses. A 1% move against a 1:100 leveraged position wipes your entire margin. Always use appropriate position sizing and stop losses.`,
        tags: ["beginner", "risk"],
      },
      {
        id: "pips-lots",
        title: "Pips & Lot Sizes",
        summary: "How price movement is measured and how position size is defined.",
        content: `**Pip (Price Interest Point)**
The smallest standard price movement for most pairs. For EUR/USD, 1 pip = 0.0001. For JPY pairs, 1 pip = 0.01.

**Pipette** — a fractional pip (5th decimal place for most pairs).

**Lot Sizes:**
| Lot Type    | Units     | ~Pip Value (EUR/USD) |
|-------------|-----------|----------------------|
| Standard    | 100,000   | ~$10 per pip         |
| Mini        | 10,000    | ~$1 per pip          |
| Micro       | 1,000     | ~$0.10 per pip       |
| Nano        | 100       | ~$0.01 per pip       |

**Position Sizing Formula:**
Risk Amount ÷ (Stop Loss in pips × Pip Value) = Lot Size

If you risk $100, stop is 20 pips, pip value is $1 → 100 ÷ (20 × 1) = 5 mini lots`,
        tags: ["beginner", "sizing"],
      },
      {
        id: "market-sessions",
        title: "Market Sessions",
        summary: "When different markets open and where volume concentrates.",
        content: `Forex operates 24/5. Understanding sessions helps you trade when volatility is highest.

**Session Times (UTC):**
| Session   | Open    | Close   | Key Pairs         |
|-----------|---------|---------|-------------------|
| Sydney    | 22:00   | 07:00   | AUD, NZD          |
| Tokyo     | 00:00   | 09:00   | JPY, AUD          |
| London    | 08:00   | 17:00   | EUR, GBP, CHF     |
| New York  | 13:00   | 22:00   | USD, CAD          |

**Overlaps (highest volume):**
- London/NY overlap (13:00–17:00 UTC) — most volatile window for major pairs
- Tokyo/London overlap (08:00–09:00 UTC) — brief but active for EUR/JPY

**Tips:**
- Avoid trading in dead zones (Sydney/Tokyo crossover for EUR/USD)
- News releases during London and NY sessions cause the biggest spikes
- Asian session often sets consolidation ranges that London breaks`,
        tags: ["beginner", "sessions"],
      },
    ],
  },
  {
    id: "technical-analysis",
    label: "Technical Analysis",
    icon: "BarChart2",
    items: [
      {
        id: "support-resistance",
        title: "Support & Resistance",
        summary: "Price levels where buying or selling pressure historically reverses price.",
        content: `**Support** is a price level where demand is strong enough to prevent further decline. Price tends to bounce from these levels.

**Resistance** is a price level where supply is strong enough to prevent further advance. Price tends to reject from these levels.

**How to Identify:**
- Previous swing highs and lows
- Round numbers (psychological levels like 1.1000, 1500.00)
- High-volume price nodes
- Prior breakout levels

**Role Reversal:** Once a resistance level is broken convincingly, it often becomes support — and vice versa. This is one of the most reliable concepts in trading.

**Strength Factors:**
- More touches = stronger level
- More time between touches = stronger level
- Larger timeframe = stronger level
- Clean, sharp bounces at the level signal strong interest`,
        tags: ["technical", "levels"],
      },
      {
        id: "trend-lines",
        title: "Trend Lines & Channels",
        summary: "Drawing the direction of price to trade with momentum.",
        content: `**Uptrend:** Series of higher highs (HH) and higher lows (HL). Draw trendline connecting the swing lows.

**Downtrend:** Series of lower highs (LH) and lower lows (LL). Draw trendline connecting the swing highs.

**Rules for Drawing:**
- Need at least 2 points to draw, 3+ points to confirm
- The more touches without breaking, the more valid the line
- Angle matters: very steep trends are unsustainable

**Trend Channels:**
Draw a parallel line on the opposite side of the trend to create a channel. Price often oscillates between channel boundaries.

**Break of Structure (BOS):**
When price breaks a swing high in a downtrend or a swing low in an uptrend, it signals a potential reversal or at minimum a pause.

**Trading Trendlines:**
- Enter on pullbacks to the trendline (with-trend entries)
- A decisive break of the trendline with follow-through signals trend change`,
        tags: ["technical", "trend"],
      },
      {
        id: "timeframe-analysis",
        title: "Multi-Timeframe Analysis",
        summary: "Using higher timeframes for direction, lower timeframes for entry.",
        content: `Multi-timeframe analysis (MTFA) involves looking at the same market across different timeframes to get a complete picture.

**The Principle:**
Higher timeframes define the trend and key levels. Lower timeframes refine your entry and timing.

**Common Framework:**
| Role         | Timeframe |
|--------------|-----------|
| Macro trend  | Weekly / Daily |
| Trade setup  | 4H / 1H   |
| Entry timing | 15M / 5M  |

**Process:**
1. Identify trend on Daily chart (are we in an uptrend/downtrend/range?)
2. Find key S/R levels on Daily or 4H
3. Wait for price to reach those levels on the 4H or 1H
4. Drop to 15M or 5M for entry confirmation (candlestick pattern, structure break)

**Rule of Thumb:** Never trade against the higher-timeframe trend unless you're a very skilled counter-trend trader. The trend is your edge.`,
        tags: ["technical", "strategy"],
      },
      {
        id: "volume",
        title: "Volume Analysis",
        summary: "How trading volume confirms or questions price moves.",
        content: `Volume measures the number of shares, contracts, or units traded in a period. It's the "fuel" behind price movements.

**Key Principles:**

**Trend Confirmation:**
- Rising price + rising volume = healthy uptrend
- Rising price + falling volume = weak move, possible reversal ahead
- Falling price + rising volume = heavy selling, strong downtrend
- Falling price + falling volume = weak selloff, possible bounce

**Volume Spikes:**
A sudden spike in volume often marks the end of a move (climactic action) or the start of a significant new one (breakout volume).

**On-Balance Volume (OBV):**
Running total of up-volume minus down-volume. Divergence between OBV and price can predict reversals.

**Note for Forex:** True volume data is unavailable in spot forex (it's decentralised). Tick volume (number of price changes per period) is used as a proxy and correlates well with actual volume.`,
        tags: ["technical", "volume"],
      },
    ],
  },
  {
    id: "candlesticks",
    label: "Candlestick Patterns",
    icon: "CandlestickChart",
    items: [
      {
        id: "candle-anatomy",
        title: "Anatomy of a Candle",
        summary: "How to read what a single candle tells you about price action.",
        content: `A candlestick shows four prices for a given period:

- **Open** — where price started
- **Close** — where price ended
- **High** — the highest price reached
- **Low** — the lowest price reached

**Body:** The rectangle between open and close.
- Green/White body = close > open (bullish)
- Red/Black body = close < open (bearish)

**Wicks/Shadows:** Lines extending from the body to the high and low.
- Upper wick = price was rejected above the body
- Lower wick = price was rejected below the body

**What to read:**
- Long body = strong conviction in that direction
- Small body = indecision
- Long upper wick = selling pressure above
- Long lower wick = buying pressure below (demand absorbed the selling)`,
        tags: ["candlestick", "beginner"],
      },
      {
        id: "doji",
        title: "Doji",
        summary: "Indecision candle — open and close are nearly equal.",
        content: `A Doji forms when the open and close are at the same price (or very close). The body is tiny, with wicks extending both ways.

**What it means:** The market is undecided. Neither buyers nor sellers won the period.

**Types:**
- **Standard Doji** — cross shape, wicks on both sides
- **Long-legged Doji** — very long wicks, extreme indecision
- **Gravestone Doji** — long upper wick, no lower wick → bearish signal (rejection from highs)
- **Dragonfly Doji** — long lower wick, no upper wick → bullish signal (strong demand below)

**Trading the Doji:**
A Doji is NOT a signal by itself. Context matters:
- Doji at a key resistance after a strong rally → likely reversal
- Doji at a key support after a strong decline → likely reversal
- Doji in the middle of a range → low significance

Confirm with the next candle's direction.`,
        tags: ["candlestick", "reversal"],
      },
      {
        id: "hammer-shooting-star",
        title: "Hammer & Shooting Star",
        summary: "Single-candle reversal patterns with a long wick on one side.",
        content: `**Hammer (Bullish)**
- Small body at the top of the candle
- Long lower wick (at least 2× the body)
- Little or no upper wick
- Appears after a downtrend
- Signals: strong buying absorbed the selling; potential reversal up

**Inverted Hammer (Bullish)**
- Small body at the bottom
- Long upper wick
- After a downtrend
- Less reliable than Hammer; needs strong bullish confirmation next candle

**Shooting Star (Bearish)**
- Small body at the bottom of the candle
- Long upper wick (at least 2× the body)
- Appears after an uptrend
- Signals: price rallied but strong selling pushed it back down; potential reversal down

**Hanging Man (Bearish)**
- Same shape as Hammer but appears after an uptrend
- Suggests the trend may be weakening

**Key Rule:** All these patterns are only meaningful at significant support/resistance levels. A Hammer in the middle of nowhere has little edge.`,
        tags: ["candlestick", "reversal"],
      },
      {
        id: "engulfing",
        title: "Engulfing Patterns",
        summary: "One candle completely swallows the previous — strong momentum shift.",
        content: `Engulfing patterns are two-candle reversal signals. The second candle's body fully engulfs the first.

**Bullish Engulfing:**
1. First candle is bearish (red)
2. Second candle is bullish (green) and its body is larger — opening below the previous close and closing above the previous open
3. Appears after a downtrend
→ Signals strong buyer momentum taking over

**Bearish Engulfing:**
1. First candle is bullish (green)
2. Second candle is bearish (red) and its body is larger
3. Appears after an uptrend
→ Signals strong seller momentum taking over

**What strengthens them:**
- Occurs at a key S/R level
- High volume on the engulfing candle
- On a higher timeframe (Daily engulfing > 5M engulfing)
- Gap between the two candles (more pronounced reversal)

**What weakens them:**
- Middle of a range
- Low volume
- Very small engulfing (barely covers previous candle)`,
        tags: ["candlestick", "reversal"],
      },
      {
        id: "pin-bar",
        title: "Pin Bar",
        summary: "A rejection candle with a long wick — price action's most reliable signal.",
        content: `A Pin Bar (Pinocchio Bar) has a long nose (wick) that protrudes out of the surrounding price action, with a small body.

**Bullish Pin Bar:**
- Long lower wick (the "nose")
- Small body near the top
- Signals price dipped into a zone and was sharply rejected → buyers are strong

**Bearish Pin Bar:**
- Long upper wick
- Small body near the bottom
- Signals price spiked into a zone and was sharply rejected → sellers are strong

**Why it works:** The long wick shows that price tested a level but couldn't sustain there. Orders were triggered, creating a sharp reversal.

**Best setups:**
- Pin bar at a higher-timeframe S/R level
- Pin bar that wicks through a level (false breakout / liquidity grab)
- Pin bar with the nose pointing into a key moving average or trendline

**Entry:** Enter on the close of the pin bar, or on a small pullback after it.
**Stop Loss:** Beyond the tip of the wick (the "nose").`,
        tags: ["candlestick", "price-action"],
      },
      {
        id: "morning-evening-star",
        title: "Morning Star & Evening Star",
        summary: "Three-candle reversal patterns marking the end of a trend.",
        content: `These are powerful three-candle reversal formations.

**Morning Star (Bullish Reversal):**
1. Large bearish candle (strong downtrend)
2. Small candle (Doji or small body) — indecision, gap down from #1 if possible
3. Large bullish candle closing into the body of candle #1

→ Signals the downtrend is ending; buyers are taking control

**Evening Star (Bearish Reversal):**
1. Large bullish candle (strong uptrend)
2. Small candle — indecision, ideally gaps above #1
3. Large bearish candle closing into the body of candle #1

→ Signals the uptrend is ending; sellers taking control

**Confirmation Requirements:**
- Ideally the third candle closes more than 50% into the first candle
- Volume should be higher on the first and third candles
- Best when occurring at a key S/R level`,
        tags: ["candlestick", "reversal"],
      },
    ],
  },
  {
    id: "chart-patterns",
    label: "Chart Patterns",
    icon: "TrendingUp",
    items: [
      {
        id: "head-shoulders",
        title: "Head & Shoulders",
        summary: "One of the most reliable reversal patterns in technical analysis.",
        content: `The Head and Shoulders pattern signals a reversal from uptrend to downtrend.

**Structure:**
- **Left Shoulder** — price rises and falls
- **Head** — price rises higher and falls back to neckline
- **Right Shoulder** — price rises but not as high as the head, then falls
- **Neckline** — the support line connecting the two troughs between the shoulders

**Entry:** Short when price breaks and closes below the neckline.
**Target:** Measure the height from the head to the neckline, then project that distance downward from the breakout.
**Stop Loss:** Above the right shoulder or above the neckline (after retest).

**Inverse Head & Shoulders (Bullish):**
Same structure flipped upside down. Signals reversal from downtrend to uptrend. Entry on neckline break upward.

**Key Notes:**
- Volume typically decreases from left shoulder to right shoulder
- A neckline retest after breakout is a high-probability entry
- The right shoulder being lower (H&S) or higher (Inverse) than the left strengthens the pattern`,
        tags: ["chart-pattern", "reversal"],
      },
      {
        id: "double-top-bottom",
        title: "Double Top & Double Bottom",
        summary: "Price tests the same level twice and fails — a clean reversal signal.",
        content: `**Double Top (Bearish Reversal):**
Price makes two consecutive peaks at roughly the same level, with a valley (the "neckline") between them. The second peak fails to break higher.

Entry: Break below the neckline valley
Target: Height of the pattern projected downward
Stop: Above the second peak

**Double Bottom (Bullish Reversal):**
Price makes two consecutive troughs at roughly the same level. Second trough holds and price rallies above the peak between the troughs.

Entry: Break above the neckline peak
Target: Height of the pattern projected upward
Stop: Below the second trough

**What to look for:**
- The two highs/lows should be at approximately the same price (within ~2%)
- There should be a clear valley or peak between them
- Volume often declines on the second top/bottom (less conviction)
- More reliable on higher timeframes (4H, Daily)

**Failure Mode:** If price breaks convincingly beyond the second peak/trough, the pattern fails — this is a continuation signal instead.`,
        tags: ["chart-pattern", "reversal"],
      },
      {
        id: "triangles",
        title: "Triangles",
        summary: "Consolidation patterns that typically break in the direction of the prior trend.",
        content: `Triangles are consolidation patterns where price ranges get progressively smaller. They indicate a coiling of energy before a breakout.

**Ascending Triangle (Bullish Bias):**
- Flat resistance at the top
- Rising support (higher lows)
- Buyers are gradually more aggressive; likely to break upper resistance
- Trade: Long on breakout above flat top

**Descending Triangle (Bearish Bias):**
- Flat support at the bottom
- Falling resistance (lower highs)
- Sellers are gradually more aggressive; likely to break lower support
- Trade: Short on breakdown below flat bottom

**Symmetrical Triangle (Neutral):**
- Both converging trendlines (lower highs + higher lows)
- No directional bias until breakout
- Trade: Wait for confirmed breakout, then enter in that direction

**Tips:**
- Volume should decrease as the triangle forms and increase sharply on breakout
- Target = height of the widest part of the triangle, measured from breakout point
- Best in trending markets; triangles in ranges are less reliable`,
        tags: ["chart-pattern", "continuation"],
      },
      {
        id: "flags-pennants",
        title: "Flags & Pennants",
        summary: "Brief consolidations within a strong trend — continuation setups.",
        content: `Flags and pennants are short-term continuation patterns that form after a strong, sharp move (the "flagpole").

**Bull Flag:**
- Strong upward move (flagpole)
- Followed by a slight pullback that channels downward or sideways (the flag)
- Break above the upper channel line signals continuation

**Bear Flag:**
- Strong downward move (flagpole)
- Brief consolidation that drifts slightly upward or sideways
- Break below the lower channel line signals continuation

**Pennant:**
- Similar to a flag but the consolidation forms a small symmetrical triangle
- Converging highs and lows after the strong move
- Breakout in the direction of the prior trend

**Measuring the Target:**
Take the length of the flagpole and add it to the breakout point.

**What to look for:**
- Volume spikes on the flagpole, decreases during consolidation, then spikes on breakout
- Pennant/flag should be brief relative to the flagpole
- The deeper and longer the consolidation, the weaker the signal`,
        tags: ["chart-pattern", "continuation"],
      },
      {
        id: "wedges",
        title: "Wedges",
        summary: "Converging trendlines both sloping the same way — often reversal signals.",
        content: `**Rising Wedge (Bearish):**
- Price makes higher highs AND higher lows, but the highs and lows are converging
- Both trendlines slope upward, but resistance rises slower than support
- Despite rising price, buyers are losing momentum
- Breakdown below lower trendline = bearish signal
- Often seen at the end of uptrends or as a bearish retracement in downtrends

**Falling Wedge (Bullish):**
- Price makes lower lows AND lower highs, but converging
- Both trendlines slope downward, but support falls slower than resistance
- Despite falling price, sellers are losing momentum
- Breakout above upper trendline = bullish signal
- Often seen at the end of downtrends or as a bullish retracement in uptrends

**Key Difference from Triangle:**
In a wedge, both lines slope the same direction. In a triangle, they converge from different directions.

**Target:** Height of the widest part of the wedge, measured from breakout.`,
        tags: ["chart-pattern", "reversal"],
      },
    ],
  },
  {
    id: "indicators",
    label: "Indicators",
    icon: "Activity",
    items: [
      {
        id: "moving-averages",
        title: "Moving Averages",
        summary: "Smooth out price noise to reveal trend direction.",
        content: `Moving averages (MAs) are trend-following indicators that smooth price data by averaging it over a period.

**Simple Moving Average (SMA):**
Average of closing prices over N periods. Each period is weighted equally.

**Exponential Moving Average (EMA):**
Gives more weight to recent prices. Reacts faster to price changes than SMA.

**Common periods:**
- 20 EMA — short-term trend (popular for dynamic S/R)
- 50 EMA — medium-term trend
- 100 / 200 EMA (or SMA) — long-term trend; watched by institutions

**How to use:**
- **Trend direction:** Price above MA = uptrend; below MA = downtrend
- **Dynamic support/resistance:** Price often bounces off key MAs
- **Crossovers:** When a shorter MA crosses above a longer MA (Golden Cross) = bullish. Cross below (Death Cross) = bearish.

**Golden Cross:** 50 MA crosses above 200 MA → long-term bullish signal
**Death Cross:** 50 MA crosses below 200 MA → long-term bearish signal

**Limitation:** MAs are lagging indicators. They confirm trends but don't predict them.`,
        tags: ["indicator", "trend"],
      },
      {
        id: "rsi",
        title: "RSI (Relative Strength Index)",
        summary: "Momentum oscillator measuring speed and change of price movements.",
        content: `RSI is a momentum oscillator ranging from 0 to 100, developed by J. Welles Wilder.

**Formula:** RSI = 100 − [100 / (1 + RS)] where RS = avg gain / avg loss over N periods (default: 14)

**Overbought / Oversold:**
- Above 70 = overbought (potential sell zone)
- Below 30 = oversold (potential buy zone)
- Note: In strong trends, RSI can stay overbought/oversold for extended periods

**Divergence (Most Powerful Use):**
- **Bullish Divergence:** Price makes a lower low but RSI makes a higher low → momentum is strengthening despite price falling → potential reversal up
- **Bearish Divergence:** Price makes a higher high but RSI makes a lower high → momentum is weakening despite price rising → potential reversal down

**Centerline (50):**
- RSI crossing above 50 from below → bullish momentum
- RSI crossing below 50 from above → bearish momentum

**Hidden Divergence (Continuation):**
- Hidden Bullish: Price makes higher low, RSI makes lower low → trend continuation signal (uptrend)
- Hidden Bearish: Price makes lower high, RSI makes higher high → trend continuation signal (downtrend)`,
        tags: ["indicator", "momentum"],
      },
      {
        id: "macd",
        title: "MACD",
        summary: "Trend-following momentum indicator using two moving averages.",
        content: `MACD (Moving Average Convergence Divergence) uses the relationship between two EMAs to measure momentum.

**Components:**
- **MACD Line:** 12 EMA − 26 EMA
- **Signal Line:** 9 EMA of the MACD Line
- **Histogram:** MACD Line − Signal Line (shows convergence/divergence visually)

**Trading Signals:**

**Crossovers:**
- MACD crosses above Signal Line → bullish
- MACD crosses below Signal Line → bearish
- More reliable when occurring below/above the zero line

**Zero Line Crossovers:**
- MACD crosses above zero → sustained bullish momentum
- MACD crosses below zero → sustained bearish momentum

**Divergence:**
- Price makes new high but MACD histogram is declining → bearish divergence
- Price makes new low but MACD histogram is rising → bullish divergence

**Limitation:** MACD is a lagging indicator. It works best on trending markets and gives false signals in ranging/choppy conditions.`,
        tags: ["indicator", "momentum"],
      },
      {
        id: "bollinger-bands",
        title: "Bollinger Bands",
        summary: "Volatility bands around a moving average to identify breakouts and squeezes.",
        content: `Bollinger Bands consist of a 20-period SMA with upper and lower bands set 2 standard deviations away.

**The Bands Expand when volatility increases** and **contract when volatility decreases.**

**Key Concepts:**

**Bollinger Squeeze:**
When the bands narrow significantly, it signals very low volatility. This coiling typically precedes a large move (breakout). The direction isn't given by the squeeze itself — wait for the breakout.

**Riding the Bands:**
In a strong trend, price can "walk" along the upper or lower band. Price consistently touching the upper band = strong uptrend.

**Mean Reversion:**
Price tends to return to the middle band (SMA 20) after touching the outer bands. In ranging markets, a touch of the upper band is a potential short and a touch of the lower band is a potential long.

**%B Indicator:**
Shows where price is relative to the bands. Above 1 = above upper band; below 0 = below lower band.

**Bandwidth:**
Measures the distance between bands. Low bandwidth = squeeze; high bandwidth = expansion.`,
        tags: ["indicator", "volatility"],
      },
      {
        id: "fibonacci",
        title: "Fibonacci Retracements",
        summary: "Using Fibonacci ratios to find potential support in a pullback.",
        content: `Fibonacci retracements are horizontal levels derived from the Fibonacci sequence, used to identify potential support and resistance in a pullback.

**Key Levels:**
- 23.6%
- 38.2%
- 50.0% (not a true Fibonacci ratio but widely watched)
- 61.8% (the "Golden Ratio" — most important)
- 78.6%

**How to Draw:**
1. Identify a significant swing high and swing low
2. In an uptrend: draw from swing low to swing high
3. In a downtrend: draw from swing high to swing low
4. The tool plots the retracement levels automatically

**Trading the Fibonacci:**
- In an uptrend, look for price to pull back to 38.2%, 50%, or 61.8% and bounce
- In a downtrend, look for price to retrace up to 38.2%, 50%, or 61.8% and continue lower
- The 61.8% level is often referred to as the "golden pocket" — deep retracements that hold here are very strong setups

**Confluence:**
Fibonacci levels become much more powerful when they align with other factors:
- Key S/R level at same price
- 50 or 200 EMA at the same zone
- Candlestick reversal signal at the level`,
        tags: ["indicator", "fibonacci"],
      },
    ],
  },
  {
    id: "risk-management",
    label: "Risk Management",
    icon: "ShieldCheck",
    items: [
      {
        id: "risk-reward",
        title: "Risk-Reward Ratio",
        summary: "How much you risk vs. how much you can make — the core of profitable trading.",
        content: `The Risk-Reward Ratio (R:R) compares the potential profit of a trade to its potential loss.

**Formula:** R:R = (Target − Entry) / (Entry − Stop Loss)

**Example:**
- Entry: 1.0800
- Stop Loss: 1.0750 (50 pips risk)
- Take Profit: 1.0900 (100 pips profit)
- R:R = 100 / 50 = 2:1

**Why it matters:**
With a 2:1 R:R, you only need to win 34% of your trades to break even.
With a 3:1 R:R, you only need to win 25% to break even.

**Minimum recommended R:R:** 1.5:1 or higher. Most professional traders aim for 2:1 or 3:1.

**Win Rate vs R:R:**
| Win Rate | Min R:R to Be Profitable |
|----------|--------------------------|
| 50%      | 1:1                      |
| 40%      | 1.5:1                    |
| 33%      | 2:1                      |
| 25%      | 3:1                      |

**Key Insight:** High R:R lets you be wrong most of the time and still profit. Many successful traders win only 40–50% of trades.`,
        tags: ["risk", "fundamentals"],
      },
      {
        id: "position-sizing",
        title: "Position Sizing",
        summary: "Calculating the correct lot size to risk only a defined % of your account.",
        content: `Position sizing determines how large your trade should be based on your account size and risk per trade.

**The 1–2% Rule:**
Never risk more than 1–2% of your total account on a single trade.

**Formula:**
Position Size = (Account Size × Risk %) / (Stop Loss in pips × Pip Value)

**Example:**
- Account: $10,000
- Risk per trade: 1% = $100
- Stop Loss: 50 pips
- Pip Value: $1 (mini lot, EUR/USD)

Position Size = $100 / (50 × $1) = 2 mini lots

**Why it matters:**
With 1% risk per trade, you need to lose 100 consecutive trades to blow your account. With 10% risk, just 10 losses in a row wipes you out.

**Dynamic Sizing:**
As your account grows, the dollar amount risked grows but the percentage stays constant. This creates compounding without increasing ruin risk.

**Multiple Positions:**
If you have multiple open trades, account for correlated markets. EUR/USD and GBP/USD are highly correlated — opening both effectively doubles your exposure.`,
        tags: ["risk", "sizing"],
      },
      {
        id: "stop-loss-placement",
        title: "Stop Loss Placement",
        summary: "Where to put your stop so it's protective but not easily hit.",
        content: `A stop loss limits your downside. The art is placing it where the market being wrong about your trade direction is proven — not just where noise takes it.

**Key Principles:**

**Structure-Based Stops (Best Method):**
Place your stop beyond a swing high or low. If price is beyond that point, your trade premise is invalidated.
- Long trade: stop below the most recent swing low
- Short trade: stop above the most recent swing high

**Beyond the Wick:**
If entering on a rejection candle, put your stop just beyond the tip of the wick. Price already went there and rejected — if it trades back through, the move is over.

**ATR-Based Stops:**
Use Average True Range to set stops relative to current volatility. A common method: Stop = Entry ± 1.5× ATR(14).

**What NOT to do:**
- Don't place stops at obvious round numbers (1.1000, 1500.00) — they attract hunts
- Don't use fixed pip stops regardless of structure
- Don't move your stop further away after a trade goes against you

**Moving Stops to Breakeven:**
Once the trade has moved ~1R in your favour, move the stop to breakeven. This removes all risk and lets the trade run for free.`,
        tags: ["risk", "stops"],
      },
      {
        id: "drawdown",
        title: "Managing Drawdown",
        summary: "How to handle losing streaks without destroying your account.",
        content: `Drawdown is the peak-to-trough decline in your account balance. Every trader faces it. How you manage it defines your survival.

**Types:**
- **Maximum Drawdown:** The largest drop from a peak before a new high is reached
- **Current Drawdown:** How much you're currently down from your most recent peak

**Drawdown by Risk Per Trade:**
| Risk/Trade | 10 Losses in a Row | 20 Losses in a Row |
|------------|--------------------|--------------------|
| 5%         | -40%               | -64%               |
| 2%         | -18%               | -33%               |
| 1%         | -9%                | -18%               |

**Rules to survive drawdown:**
1. **Reduce size** — when down 10%, cut position size by 25–50% until you recover
2. **Review, don't revenge trade** — after 3 losses in a row, stop and review your trades
3. **Max daily loss rule** — set a maximum daily loss (e.g. 3%) and stop trading when hit
4. **Keep a journal** — most drawdowns come from specific recurring mistakes

**Recovery Math:**
A 50% loss requires a 100% gain to recover. This is why limiting drawdown is more important than maximising wins.`,
        tags: ["risk", "psychology"],
      },
    ],
  },
  {
    id: "strategies",
    label: "Strategies",
    icon: "Crosshair",
    items: [
      {
        id: "trend-following",
        title: "Trend Following",
        summary: "Trade in the direction of the dominant trend — the most reliable edge.",
        content: `Trend following is the strategy of identifying a market's dominant direction and entering trades aligned with it.

**Core Principle:** "The trend is your friend until the end."

**How to Identify the Trend:**
1. Higher timeframe moving averages (price above 200 EMA = uptrend)
2. Series of higher highs and higher lows (uptrend)
3. Price consistently making new highs/lows

**Entry Methods:**
- **Pullback Entry:** Wait for price to retrace to a key level (EMA, support, Fibonacci) before entering in the trend direction. Best R:R.
- **Breakout Entry:** Enter when price breaks a key level confirming trend continuation. More risk but high momentum.

**Common Setup — EMA Pullback:**
1. Identify uptrend on 4H (price above 50 EMA)
2. Drop to 1H and wait for pullback to the 50 EMA
3. Look for bullish candlestick confirmation at the EMA
4. Enter long, stop below recent swing low, target next resistance

**Exit Management:**
- Trail stop loss as trade moves
- Take partial profit at key levels (lock in gains)
- Exit when trend structure breaks`,
        tags: ["strategy"],
      },
      {
        id: "breakout-trading",
        title: "Breakout Trading",
        summary: "Enter when price breaks a key level with momentum and volume.",
        content: `Breakout trading involves entering a position when price moves outside a defined range or key level with strong momentum.

**Types of Breakouts:**
- **Range Breakout:** Price breaks out of a consolidation box
- **Pattern Breakout:** Break from triangle, flag, wedge
- **Level Breakout:** Break of key support/resistance or daily high/low

**Key Characteristics of Valid Breakouts:**
1. High volume on the breakout candle
2. Strong close (candle closes well beyond the level)
3. Prior trend context supports the direction
4. Not extended far from the mean (not parabolic)

**False Breakout (Fakeout):**
Price briefly breaks a level, triggers traders, then reverses. Very common at obvious levels. To filter:
- Wait for a candle close beyond the level (not just a wick)
- Wait for a retest and hold
- Require volume confirmation

**Retest Entry Strategy:**
Instead of entering on the break, wait for price to break, then pull back and retest the level from the other side. More conservative entry with better R:R and higher confirmation.

**Targets:**
Measure the height of the range or pattern and project from the breakout point.`,
        tags: ["strategy", "breakout"],
      },
      {
        id: "range-trading",
        title: "Range Trading",
        summary: "Sell the top of a range, buy the bottom — works in choppy, sideways markets.",
        content: `Range trading profits from price oscillating between defined support and resistance levels without making a directional move.

**Identifying a Range:**
- Price bouncing between two clearly defined horizontal levels
- No series of higher highs / lower lows
- Market is in consolidation or between key macro levels

**Entry:**
- Buy near support with stop below support; target near resistance
- Sell near resistance with stop above resistance; target near support

**Filters to improve accuracy:**
- Look for rejection candles (pin bar, doji, engulfing) at the boundaries
- RSI overbought at resistance, oversold at support
- Minimum 3 touches on each boundary before trading

**Risk:**
Ranges always end in a breakout. Always use a stop loss and don't fight the breakout when it comes.

**Time of Day:**
Ranges most commonly form during low-volume periods:
- Asian session for major forex pairs
- Lunch hours in equity markets

**Warning Signs Range is Breaking:**
- Price spending more time at one boundary than the other
- Volume increasing in one direction
- Break of internal structure (new swing high/low within the range)`,
        tags: ["strategy", "range"],
      },
      {
        id: "news-trading",
        title: "News & Event Trading",
        summary: "Trading around high-impact economic releases and central bank decisions.",
        content: `Economic news releases cause sharp, rapid price moves. Trading them requires understanding both the fundamental context and technical positioning.

**High-Impact Events:**
- Non-Farm Payrolls (NFP) — first Friday of the month, USD
- CPI / Inflation data — monthly
- Central Bank decisions (Fed, ECB, BOE, BOJ)
- GDP releases
- PMI data (Manufacturing, Services)

**Strategies:**

**Straddle (Before release):**
Place a buy stop above and sell stop below current price before the release. One order triggers on the spike. Risk: both orders can trigger if there's a spike both ways (whipsaw).

**Fade the Spike (After release):**
Wait for the initial spike to run its course, then trade the reversal back. Works when the "buy the rumour, sell the news" dynamic plays out.

**Trade the Trend (Post-release):**
After the initial volatility settles (5–15 minutes), identify the new directional bias and trade the continuation.

**Key Rules:**
- Widen stops during news (slippage is common)
- Reduce position size
- Know the expected vs. actual difference — a strong number can still sell off if it was "priced in"
- Don't hold swing trades through major releases unless you understand the fundamental context`,
        tags: ["strategy", "news", "fundamental"],
      },
    ],
  },
  {
    id: "smc",
    label: "Smart Money Concepts",
    icon: "Building2",
    items: [
      {
        id: "smc-overview",
        title: "What is SMC?",
        summary: "Understanding how institutional money moves markets — and how to follow it.",
        content: `Smart Money Concepts (SMC) is a trading framework based on understanding how institutional traders (banks, hedge funds, liquidity providers) operate and how retail traders can align with their activity.

**Core Premise:**
Markets are not random. They are engineered by institutions to achieve specific objectives: accumulate positions at low prices, distribute at high prices.

**Key Ideas:**
1. **Liquidity is the objective** — institutions need large amounts of liquidity to fill their orders. They push price to areas where retail stop losses cluster (above swing highs, below swing lows) to get filled.

2. **Retail traps** — the market often fakes out obvious retail levels before moving in the "true" direction.

3. **Following the flow** — instead of trading patterns in isolation, SMC traders read the underlying intent of price movement.

**SMC vs. Traditional TA:**
Traditional TA: "Price is at resistance, sell."
SMC: "Why is price at resistance? Is this a liquidity grab before a real move higher, or is distribution happening? Where is the next draw on liquidity?"

**Core concepts to learn:**
- Market Structure (BOS, CHOCH)
- Order Blocks
- Fair Value Gaps (FVG)
- Liquidity (BSL/SSL)
- Premium/Discount zones`,
        tags: ["smc", "institutional"],
      },
      {
        id: "market-structure",
        title: "Market Structure",
        summary: "Break of Structure (BOS) and Change of Character (CHOCH) — the foundation of SMC.",
        content: `Market structure is the foundation of SMC — it tells you the current directional bias.

**Bullish Structure:**
Series of Higher Highs (HH) and Higher Lows (HL)

**Bearish Structure:**
Series of Lower Lows (LL) and Lower Highs (LH)

**Break of Structure (BOS):**
In a bullish trend, a BOS occurs when price breaks above the previous swing high. This confirms the uptrend is continuing. In a bearish trend, a BOS occurs when price breaks below the previous swing low.

**Change of Character (CHOCH):**
A CHOCH signals a potential trend reversal:
- In a bullish trend: price breaks BELOW the most recent swing low (first sign buyers are losing control)
- In a bearish trend: price breaks ABOVE the most recent swing high

**CHOCH vs BOS:**
- BOS = trend continuation (expected, confirms direction)
- CHOCH = trend reversal signal (unexpected, changes the narrative)

**Usage:**
1. Identify the current market structure on higher timeframes
2. Only look for BOS in the trend direction on lower timeframes
3. A CHOCH on a lower timeframe signals a pullback or reversal; use it for counter-trend entries or to avoid entries against it`,
        tags: ["smc", "structure"],
      },
      {
        id: "order-blocks",
        title: "Order Blocks",
        summary: "The last opposing candle before a strong move — where institutions left orders.",
        content: `An Order Block (OB) is the last bullish or bearish candle before a strong impulsive move. It represents an area where institutional orders are believed to be placed.

**Bullish Order Block:**
The last bearish (red) candle before a strong bullish impulse move upward. When price returns to this zone, institutions are expected to re-engage their buy orders.

**Bearish Order Block:**
The last bullish (green) candle before a strong bearish impulse move downward. When price returns to this zone, institutions may add to sell positions.

**What makes a valid Order Block:**
1. Followed by a strong impulsive move (many candles in one direction)
2. The move causes a Break of Structure
3. There is a clear imbalance (Fair Value Gap) created by the impulse
4. Price hasn't returned to it yet (untested)

**Trading Order Blocks:**
1. Identify impulse move + BOS on higher timeframe
2. Mark the last opposing candle before the impulse (that's the OB zone)
3. Wait for price to retrace to the OB
4. Look for entry confirmation at the OB (rejection candle, FVG fill)
5. Stop: beyond the OB; Target: next liquidity level

**Mitigation:** An OB is considered "mitigated" (used up) when price trades into it and continues. Once mitigated, it loses its power.`,
        tags: ["smc", "order-blocks"],
      },
      {
        id: "fvg",
        title: "Fair Value Gap (FVG)",
        summary: "Price imbalances that the market tends to return to fill.",
        content: `A Fair Value Gap (FVG) — also called an imbalance or inefficiency — is a three-candle pattern where price moves so fast that there is a gap in the market structure.

**How to Identify:**
Look at three consecutive candles. If candle 1's high does not overlap with candle 3's low (bullish FVG), there is an imbalance. The gap between candle 1's high and candle 3's low is the FVG.

**Bullish FVG:**
- Candle 1 high < Candle 3 low
- Represents an area where price moved up too fast — potential support zone
- Price tends to return and fill this gap

**Bearish FVG:**
- Candle 1 low > Candle 3 high
- Represents an area where price moved down too fast — potential resistance zone

**Usage in Trading:**
1. Identify a bullish move with an FVG created
2. Wait for price to retrace into the FVG
3. Look for bullish reversal signals within the FVG
4. Enter long, targeting the next liquidity above

**Combining FVG + Order Block:**
When an FVG overlaps with an Order Block zone, the confluence makes it a significantly stronger entry area.

**Note:** Not all FVGs get filled — some gaps in fast-moving trending markets remain open for extended periods.`,
        tags: ["smc", "fvg", "imbalance"],
      },
      {
        id: "liquidity",
        title: "Liquidity",
        summary: "Where stop losses cluster — and how institutions hunt them before the real move.",
        content: `In SMC, liquidity refers to clusters of buy or sell orders (stop losses and pending orders) resting at specific price levels. Institutions need this liquidity to fill their large positions.

**Types of Liquidity:**

**Buy-Side Liquidity (BSL):**
Above swing highs and equal highs. Retail traders who are short have their stop losses here. Institutions drive price up to trigger these stops (buying from shorts), then reverse.

**Sell-Side Liquidity (SSL):**
Below swing lows and equal lows. Retail traders who are long have their stop losses here. Institutions push price down to trigger these stops (selling to longs), then reverse.

**Liquidity Sweep (Stop Hunt):**
When price briefly breaks a swing high/low, triggers stop losses, then quickly reverses. Classic retail trap.

**Equal Highs / Equal Lows:**
Two or more highs/lows at the same price level signal double or triple tops/bottoms. These attract resting orders and are prime sweep targets.

**Trading the Sweep:**
1. Identify obvious liquidity (equal highs/lows, swing points)
2. Wait for price to sweep the level (wick through it)
3. Look for a sharp reversal candle
4. Enter in the reversal direction with stop beyond the sweep wick
5. Target the opposite liquidity pool`,
        tags: ["smc", "liquidity"],
      },
      {
        id: "premium-discount",
        title: "Premium & Discount Zones",
        summary: "The optimal areas to buy (discount) and sell (premium) within a range.",
        content: `In SMC, every price range between a swing low and swing high is divided into Premium and Discount zones using the 50% midpoint.

**Setup:**
1. Identify a significant swing low and swing high
2. Mark the 50% level (equilibrium)
3. Everything above 50% = Premium zone
4. Everything below 50% = Discount zone

**The Logic:**
- In an uptrend, you want to BUY in the Discount zone (below 50%) — you're getting a better price than the midpoint
- In a downtrend, you want to SELL in the Premium zone (above 50%) — you're selling at a higher price than the midpoint

**Key Levels Within the Range:**
- 50% = Equilibrium (no edge, avoid entries here)
- 62–79% range = Golden Pocket (best buy zone in discount, best sell zone in premium)
- Extreme discount (<25%) = very aggressive buy zone in uptrend
- Extreme premium (>75%) = very aggressive sell zone in downtrend

**Combining with OBs and FVGs:**
The best trades come when an Order Block or FVG sits within the discount zone (for longs) or premium zone (for shorts). Triple confluence = highest probability setup.`,
        tags: ["smc", "zones"],
      },
    ],
  },
  {
    id: "psychology",
    label: "Psychology",
    icon: "Brain",
    items: [
      {
        id: "trading-psychology-basics",
        title: "Trading Psychology Basics",
        summary: "Your mindset is your biggest edge — or your biggest liability.",
        content: `Trading is one of the few activities where emotional control directly determines financial outcomes. Technical skill alone is not enough.

**The Emotional Cycle of a Trade:**

1. Optimism / excitement before entry
2. Hope as the trade moves favourably
3. Thrill at peak profit
4. Anxiety when it starts reversing
5. Denial ("it will come back")
6. Fear at paper loss
7. Panic at the stop
8. Capitulation (move stop or let it blow)

The goal is to stay flat — operating from logic, not emotion.

**Common Psychological Traps:**

**Fear of Missing Out (FOMO):**
Chasing a move after it's already run. Results in poor entries and high R that doesn't justify the risk.

**Revenge Trading:**
Taking an impulsive trade to "make back" a loss. Almost always results in a second (larger) loss.

**Overtrading:**
Taking too many trades out of boredom or excitement. More trades ≠ more profit.

**Confirmation Bias:**
Only seeing signals that agree with your existing bias. Ignoring contradicting evidence.

**Solution:**
A trading plan with predefined rules. When in doubt, don't trade. Protect the account first.`,
        tags: ["psychology", "mindset"],
      },
      {
        id: "trading-journal",
        title: "The Trading Journal",
        summary: "The single most important tool for long-term improvement.",
        content: `A trading journal is a record of every trade you take with enough detail to learn from both wins and losses.

**What to record:**
- Date and time
- Instrument and timeframe
- Entry, stop loss, and target prices
- Position size and R risked
- Setup type (e.g., "OB pullback in uptrend")
- Screenshot of the entry (mark your plan)
- Result (R gained/lost)
- Emotional state (rushed? hesitant? confident?)
- Review notes: what did you do well? what would you change?

**Weekly Review Process:**
1. Sort by setup type — which setups are profitable?
2. Look for recurring mistakes (moved stop, entered FOMO, oversized)
3. Calculate win rate and average R:R per setup
4. Remove setups with negative expectancy
5. Double down on high-expectancy setups

**The Compound Effect:**
Traders who journal and review consistently outperform those who don't, regardless of starting skill level. The journal converts experience into knowledge.

**Tools:**
Spreadsheet (Google Sheets), Notion, dedicated apps like TraderVue, Edgewonk, or even your PnL calendar here in the terminal.`,
        tags: ["psychology", "process"],
      },
      {
        id: "trading-plan",
        title: "Building a Trading Plan",
        summary: "Your rules for when to trade, how to trade, and how to manage it.",
        content: `A trading plan is your rulebook. It defines your strategy, criteria, and limits before you open a chart — removing emotion from real-time decisions.

**What a Trading Plan Includes:**

**1. Market and Timeframe:**
Which instruments you trade and on which timeframes. Specialise — don't trade 20 pairs.

**2. Entry Criteria:**
Specific, observable conditions that must be met. Example: "I only take trades at higher-timeframe OBs in the direction of the 4H trend, with an FVG or pin bar as entry confirmation."

**3. Risk Parameters:**
- Max risk per trade: 1%
- Max open trades: 3
- Max daily loss: 3% (stop trading for the day if hit)
- Max weekly loss: 5%

**4. Trade Management:**
- Where to move stop to breakeven
- Partial take-profit rules
- Trailing stop method

**5. Session Rules:**
Which hours you trade. Avoid illiquid sessions for your strategy.

**6. Review Schedule:**
Daily brief review, weekly deep review.

**The Test:**
Can you give your plan to another trader and have them take the same trades as you? If yes, it's specific enough. If not, it needs more definition.`,
        tags: ["psychology", "planning"],
      },
    ],
  },
];
