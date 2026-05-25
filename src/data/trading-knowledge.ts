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
        content: `Trading is the act of buying and selling financial instruments  -  such as currencies, stocks, commodities, or indices  -  with the goal of making a profit from price changes.

**Types of Traders:**
- **Scalper**  -  holds trades for seconds to minutes, targets small moves
- **Day Trader**  -  opens and closes all trades within the same day
- **Swing Trader**  -  holds trades from a few days to weeks
- **Position Trader**  -  holds trades for weeks to months based on macro trends

**Key Markets:**
- **Forex**  -  currency pairs (EUR/USD, GBP/JPY, etc.)
- **Crypto**  -  digital assets (BTC, ETH, etc.)
- **Indices**  -  baskets of stocks (S&P 500, NASDAQ, etc.)
- **Commodities**  -  physical goods (Gold, Oil, Silver)
- **Stocks**  -  shares in individual companies`,
        tags: ["intro", "beginner"],
      },
      {
        id: "bid-ask-spread",
        title: "Bid, Ask & Spread",
        summary: "The two prices every market has  -  and the cost between them.",
        content: `Every tradable market has two prices at any given time:

- **Bid**  -  the price buyers are willing to pay (you sell here)
- **Ask**  -  the price sellers are willing to accept (you buy here)
- **Spread**  -  the difference between bid and ask; this is the broker's cut

**Example:**
EUR/USD Bid: 1.08500 | Ask: 1.08503 → Spread = 0.3 pips

A tighter spread means lower trading cost. Liquid pairs like EUR/USD and major indices have tighter spreads. Exotic pairs have wider spreads.

**Tip:** Always account for spread when setting your take-profit and stop-loss targets.`,
        tags: ["beginner", "costs"],
      },
      {
        id: "order-types",
        title: "Order Types",
        summary: "Market, limit, stop  -  and how each fills your trade.",
        content: `Understanding order types is essential for precise trade execution.

**Market Order**
Executes immediately at the current best available price. Fast but you accept whatever price the market gives.

**Limit Order**
Executes only at your specified price or better. Buy limit = below market; Sell limit = above market. Used to enter at key levels without chasing.

**Stop Order (Stop Market)**
Triggers a market order once price reaches your stop level. Used to enter breakouts or cut losses. Becomes a market order on trigger  -  can slip in fast markets.

**Stop-Limit Order**
Like a stop order but converts to a limit order instead of market. More precise but risks not filling in fast moves.

**Trailing Stop**
A stop that moves with price in your favour by a set distance. Locks in profit as the trade runs.`,
        tags: ["beginner", "execution"],
      },
      {
        id: "leverage-margin",
        title: "Leverage & Margin",
        summary: "Trading bigger than your account  -  and why it's a double-edged sword.",
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

**Pipette**  -  a fractional pip (5th decimal place for most pairs).

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
- London/NY overlap (13:00–17:00 UTC)  -  most volatile window for major pairs
- Tokyo/London overlap (08:00–09:00 UTC)  -  brief but active for EUR/JPY

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

**Role Reversal:** Once a resistance level is broken convincingly, it often becomes support  -  and vice versa. This is one of the most reliable concepts in trading.

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

- **Open**  -  where price started
- **Close**  -  where price ended
- **High**  -  the highest price reached
- **Low**  -  the lowest price reached

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
        summary: "Indecision candle  -  open and close are nearly equal.",
        content: `A Doji forms when the open and close are at the same price (or very close). The body is tiny, with wicks extending both ways.

**What it means:** The market is undecided. Neither buyers nor sellers won the period.

**Types:**
- **Standard Doji**  -  cross shape, wicks on both sides
- **Long-legged Doji**  -  very long wicks, extreme indecision
- **Gravestone Doji**  -  long upper wick, no lower wick → bearish signal (rejection from highs)
- **Dragonfly Doji**  -  long lower wick, no upper wick → bullish signal (strong demand below)

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
        summary: "One candle completely swallows the previous  -  strong momentum shift.",
        content: `Engulfing patterns are two-candle reversal signals. The second candle's body fully engulfs the first.

**Bullish Engulfing:**
1. First candle is bearish (red)
2. Second candle is bullish (green) and its body is larger  -  opening below the previous close and closing above the previous open
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
        summary: "A rejection candle with a long wick  -  price action's most reliable signal.",
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
2. Small candle (Doji or small body)  -  indecision, gap down from #1 if possible
3. Large bullish candle closing into the body of candle #1

→ Signals the downtrend is ending; buyers are taking control

**Evening Star (Bearish Reversal):**
1. Large bullish candle (strong uptrend)
2. Small candle  -  indecision, ideally gaps above #1
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
- **Left Shoulder**  -  price rises and falls
- **Head**  -  price rises higher and falls back to neckline
- **Right Shoulder**  -  price rises but not as high as the head, then falls
- **Neckline**  -  the support line connecting the two troughs between the shoulders

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
        summary: "Price tests the same level twice and fails  -  a clean reversal signal.",
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

**Failure Mode:** If price breaks convincingly beyond the second peak/trough, the pattern fails  -  this is a continuation signal instead.`,
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
        summary: "Brief consolidations within a strong trend  -  continuation setups.",
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
        summary: "Converging trendlines both sloping the same way  -  often reversal signals.",
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
- 20 EMA  -  short-term trend (popular for dynamic S/R)
- 50 EMA  -  medium-term trend
- 100 / 200 EMA (or SMA)  -  long-term trend; watched by institutions

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
When the bands narrow significantly, it signals very low volatility. This coiling typically precedes a large move (breakout). The direction isn't given by the squeeze itself  -  wait for the breakout.

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
- 61.8% (the "Golden Ratio"  -  most important)
- 78.6%

**How to Draw:**
1. Identify a significant swing high and swing low
2. In an uptrend: draw from swing low to swing high
3. In a downtrend: draw from swing high to swing low
4. The tool plots the retracement levels automatically

**Trading the Fibonacci:**
- In an uptrend, look for price to pull back to 38.2%, 50%, or 61.8% and bounce
- In a downtrend, look for price to retrace up to 38.2%, 50%, or 61.8% and continue lower
- The 61.8% level is often referred to as the "golden pocket"  -  deep retracements that hold here are very strong setups

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
        summary: "How much you risk vs. how much you can make  -  the core of profitable trading.",
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
If you have multiple open trades, account for correlated markets. EUR/USD and GBP/USD are highly correlated  -  opening both effectively doubles your exposure.`,
        tags: ["risk", "sizing"],
      },
      {
        id: "stop-loss-placement",
        title: "Stop Loss Placement",
        summary: "Where to put your stop so it's protective but not easily hit.",
        content: `A stop loss limits your downside. The art is placing it where the market being wrong about your trade direction is proven  -  not just where noise takes it.

**Key Principles:**

**Structure-Based Stops (Best Method):**
Place your stop beyond a swing high or low. If price is beyond that point, your trade premise is invalidated.
- Long trade: stop below the most recent swing low
- Short trade: stop above the most recent swing high

**Beyond the Wick:**
If entering on a rejection candle, put your stop just beyond the tip of the wick. Price already went there and rejected  -  if it trades back through, the move is over.

**ATR-Based Stops:**
Use Average True Range to set stops relative to current volatility. A common method: Stop = Entry ± 1.5× ATR(14).

**What NOT to do:**
- Don't place stops at obvious round numbers (1.1000, 1500.00)  -  they attract hunts
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
1. **Reduce size**  -  when down 10%, cut position size by 25–50% until you recover
2. **Review, don't revenge trade**  -  after 3 losses in a row, stop and review your trades
3. **Max daily loss rule**  -  set a maximum daily loss (e.g. 3%) and stop trading when hit
4. **Keep a journal**  -  most drawdowns come from specific recurring mistakes

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
        summary: "Trade in the direction of the dominant trend  -  the most reliable edge.",
        content: `Trend following is the strategy of identifying a market's dominant direction and entering trades aligned with it.

**Core Principle:** "The trend is your friend until the end."

**How to Identify the Trend:**
1. Higher timeframe moving averages (price above 200 EMA = uptrend)
2. Series of higher highs and higher lows (uptrend)
3. Price consistently making new highs/lows

**Entry Methods:**
- **Pullback Entry:** Wait for price to retrace to a key level (EMA, support, Fibonacci) before entering in the trend direction. Best R:R.
- **Breakout Entry:** Enter when price breaks a key level confirming trend continuation. More risk but high momentum.

**Common Setup  -  EMA Pullback:**
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
        summary: "Sell the top of a range, buy the bottom  -  works in choppy, sideways markets.",
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
- Non-Farm Payrolls (NFP)  -  first Friday of the month, USD
- CPI / Inflation data  -  monthly
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
- Know the expected vs. actual difference  -  a strong number can still sell off if it was "priced in"
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
        summary: "Understanding how institutional money moves markets  -  and how to follow it.",
        content: `Smart Money Concepts (SMC) is a trading framework based on understanding how institutional traders (banks, hedge funds, liquidity providers) operate and how retail traders can align with their activity.

**Core Premise:**
Markets are not random. They are engineered by institutions to achieve specific objectives: accumulate positions at low prices, distribute at high prices.

**Key Ideas:**
1. **Liquidity is the objective**  -  institutions need large amounts of liquidity to fill their orders. They push price to areas where retail stop losses cluster (above swing highs, below swing lows) to get filled.

2. **Retail traps**  -  the market often fakes out obvious retail levels before moving in the "true" direction.

3. **Following the flow**  -  instead of trading patterns in isolation, SMC traders read the underlying intent of price movement.

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
        summary: "Break of Structure (BOS) and Change of Character (CHOCH)  -  the foundation of SMC.",
        content: `Market structure is the foundation of SMC  -  it tells you the current directional bias.

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
        summary: "The last opposing candle before a strong move  -  where institutions left orders.",
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
        content: `A Fair Value Gap (FVG)  -  also called an imbalance or inefficiency  -  is a three-candle pattern where price moves so fast that there is a gap in the market structure.

**How to Identify:**
Look at three consecutive candles. If candle 1's high does not overlap with candle 3's low (bullish FVG), there is an imbalance. The gap between candle 1's high and candle 3's low is the FVG.

**Bullish FVG:**
- Candle 1 high < Candle 3 low
- Represents an area where price moved up too fast  -  potential support zone
- Price tends to return and fill this gap

**Bearish FVG:**
- Candle 1 low > Candle 3 high
- Represents an area where price moved down too fast  -  potential resistance zone

**Usage in Trading:**
1. Identify a bullish move with an FVG created
2. Wait for price to retrace into the FVG
3. Look for bullish reversal signals within the FVG
4. Enter long, targeting the next liquidity above

**Combining FVG + Order Block:**
When an FVG overlaps with an Order Block zone, the confluence makes it a significantly stronger entry area.

**Note:** Not all FVGs get filled  -  some gaps in fast-moving trending markets remain open for extended periods.`,
        tags: ["smc", "fvg", "imbalance"],
      },
      {
        id: "liquidity",
        title: "Liquidity",
        summary: "Where stop losses cluster  -  and how institutions hunt them before the real move.",
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
- In an uptrend, you want to BUY in the Discount zone (below 50%)  -  you're getting a better price than the midpoint
- In a downtrend, you want to SELL in the Premium zone (above 50%)  -  you're selling at a higher price than the midpoint

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
        summary: "Your mindset is your biggest edge  -  or your biggest liability.",
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

The goal is to stay flat  -  operating from logic, not emotion.

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
1. Sort by setup type  -  which setups are profitable?
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
        content: `A trading plan is your rulebook. It defines your strategy, criteria, and limits before you open a chart  -  removing emotion from real-time decisions.

**What a Trading Plan Includes:**

**1. Market and Timeframe:**
Which instruments you trade and on which timeframes. Specialise  -  don't trade 20 pairs.

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
  {
    id: "forex-basics",
    label: "Forex Fundamentals",
    icon: "Building2",
    items: [
      {
        id: "currency-pairs",
        title: "Currency Pairs Explained",
        summary: "Majors, minors, and exotics — how forex pairs are classified.",
        content: `Every forex trade involves buying one currency and selling another. The pair is written as BASE/QUOTE  -  e.g. EUR/USD means buying Euros with US Dollars.

## Major Pairs
The most traded pairs, all involving USD. Tightest spreads, highest liquidity:
- EUR/USD (Euro / US Dollar)
- GBP/USD (British Pound / US Dollar)
- USD/JPY (US Dollar / Japanese Yen)
- USD/CHF (US Dollar / Swiss Franc)
- AUD/USD (Australian Dollar / US Dollar)
- USD/CAD (US Dollar / Canadian Dollar)
- NZD/USD (New Zealand Dollar / US Dollar)

## Minor Pairs (Cross Pairs)
No USD, but involve major currencies. Slightly wider spreads:
- EUR/GBP, EUR/JPY, GBP/JPY
- AUD/JPY, CAD/JPY, NZD/JPY

## Exotic Pairs
One major currency + one emerging market currency. Wide spreads, lower liquidity, higher risk:
- USD/ZAR, USD/TRY, USD/MXN, EUR/SGD

## How to Read a Quote
If EUR/USD = 1.0850, one Euro buys 1.0850 US Dollars.
- If price goes UP → Euro strengthened (or Dollar weakened)
- If price goes DOWN → Euro weakened (or Dollar strengthened)

## Base vs Quote
**Base currency** = first in the pair (what you're buying/selling)
**Quote currency** = second (what you're paying with)

**Tip:** Stick to majors when starting. They have the best liquidity and most reliable technical patterns.`,
        tags: ["forex", "basics", "currency pairs"],
      },
      {
        id: "pair-correlations",
        title: "Currency Pair Correlations",
        summary: "How pairs move together — and why it matters for your risk.",
        content: `Some pairs move in the same direction (positive correlation), others move in opposite directions (negative correlation). This matters because trading correlated pairs can unknowingly double your risk.

## Positive Correlations (move together)
- **EUR/USD & GBP/USD** — both are USD-denominated European currencies. Often move ~80-90% in sync.
- **AUD/USD & NZD/USD** — commodity-linked Antipodean currencies.
- **EUR/USD & AUD/USD** — both tend to rise when USD weakens.

## Negative Correlations (move opposite)
- **EUR/USD & USD/CHF** — nearly perfectly inverse (~-90%). When EUR/USD rises, USD/CHF falls.
- **EUR/USD & USD/JPY** — often inversely correlated.
- **GBP/USD & USD/CAD** — tend to move opposite.

## Why It Matters for Risk
If you're long EUR/USD AND long GBP/USD, you're essentially taking the same USD-bearish trade twice. If USD strengthens, both positions lose simultaneously  -  doubling your drawdown.

**Rule:** Treat correlated pairs as one position when calculating total risk. If you risk 1% on EUR/USD and 1% on GBP/USD (both long), your effective risk is ~2% on a "USD weakens" bet.

## Risk-On vs Risk-Off
- **Risk-on** (market optimism): AUD, NZD, CAD rally; JPY, CHF weaken
- **Risk-off** (fear/uncertainty): JPY, CHF, USD rally; AUD, NZD, CAD fall

USD/JPY and AUD/JPY are classic risk sentiment indicators.`,
        tags: ["forex", "correlation", "risk"],
      },
      {
        id: "carry-trade",
        title: "The Carry Trade",
        summary: "Profiting from interest rate differentials between currencies.",
        content: `A carry trade involves borrowing in a low-interest-rate currency and investing in a high-interest-rate currency, profiting from the difference (the "carry").

## How It Works
Every currency has an interest rate set by its central bank. When you hold a forex position overnight (past 5pm NY), you either earn or pay the interest rate differential (called the **swap** or **rollover**).

**Example:**
- Australian Dollar (AUD) rate: 4.35%
- Japanese Yen (JPY) rate: 0.10%
- Difference: ~4.25%

If you're long AUD/JPY, you earn ~4.25% per year (paid daily in small increments) just for holding the position overnight.

## When Carries Work
Carry trades thrive in low-volatility, risk-on environments. Investors seek yield when markets are calm.

## Carry Trade Unwinds
When volatility spikes (e.g. financial crisis, major geopolitical event), carry trades unwind fast. Everyone rushes to buy back the funding currency (usually JPY or CHF), causing sharp moves.

**Classic example:** AUD/JPY drops violently during risk-off events because carry traders close longs.

## Checking Swaps
Your broker shows the daily swap rate for each pair. Long and short swaps differ. Some pairs have negative swaps both ways  -  avoid holding those overnight.

**Tip:** For swing/position traders, positive swaps can add meaningful return over weeks. For short-term traders, swaps are usually irrelevant.`,
        tags: ["forex", "carry trade", "interest rates", "swap"],
      },
      {
        id: "central-banks",
        title: "Central Banks & Monetary Policy",
        summary: "How central bank decisions drive currency movements.",
        content: `Central banks are the most powerful force in forex markets. Their decisions on interest rates and monetary policy directly move currencies.

## Key Central Banks
| Central Bank | Currency | Abbreviation |
|---|---|---|
| Federal Reserve | USD | Fed / FOMC |
| European Central Bank | EUR | ECB |
| Bank of England | GBP | BoE |
| Bank of Japan | JPY | BoJ |
| Swiss National Bank | CHF | SNB |
| Reserve Bank of Australia | AUD | RBA |
| Bank of Canada | CAD | BoC |

## Interest Rate Decisions
The single biggest mover in forex. Higher rates → more attractive to foreign investors → currency appreciates.

**Rate hike** → currency strengthens
**Rate cut** → currency weakens
**Hold (no change)** → focus shifts to tone (hawkish vs dovish)

## Hawkish vs Dovish
- **Hawkish:** Concerned about inflation, signals rate hikes → bullish for the currency
- **Dovish:** Concerned about growth/employment, signals rate cuts → bearish for the currency

Even if rates stay unchanged, a hawkish press conference can rally the currency. The *tone* matters as much as the decision.

## Quantitative Easing (QE) vs Tightening (QT)
- **QE:** Central bank buys bonds, pumping money into economy → weakens currency
- **QT:** Reduces balance sheet, removes liquidity → tends to strengthen currency

## How to Trade Central Banks
1. Mark all central bank meeting dates in your economic calendar
2. Avoid trading the 15-30 minutes before announcements (spreads widen, stops get hunted)
3. Wait for the initial volatility spike to settle before entering
4. The move after the *press conference* (where the governor speaks) is often more directional than the rate decision itself`,
        tags: ["forex", "central bank", "interest rates", "fundamental"],
      },
      {
        id: "cot-report",
        title: "COT Report",
        summary: "How to read the Commitments of Traders report to gauge market positioning.",
        content: `The **Commitments of Traders (COT)** report is published every Friday by the CFTC (US Commodity Futures Trading Commission). It shows the positioning of large institutional traders (hedge funds, commercial hedgers) in futures markets.

## The Three Groups
**1. Commercial Hedgers**
Companies that use currencies operationally (e.g. an airline hedging fuel costs). They trade against the trend to hedge risk. Generally considered "smart money" but are always positioned against the trend by nature.

**2. Non-Commercial (Large Speculators)**
Hedge funds, managed money, large traders. These are the ones to watch  -  they follow trends and their positioning often predicts continuation.

**3. Non-Reportable (Small Speculators)**
Retail traders. Often used as a contrarian indicator  -  when retail is extremely one-sided, the market tends to reverse.

## How to Use It
- When large speculators (hedge funds) are at **extreme long** positions historically: market may be over-extended, watch for a reversal
- When large speculators are **building longs** from a low position: trend may be strengthening
- **Contrarian signal:** When retail (non-reportable) is 80%+ long, consider looking for shorts

## Where to Find It
- CFTC website (free, released every Friday, data from Tuesday)
- Many trading sites offer visual COT charts (e.g. barchart.com, investing.com)

## Limitation
COT data is released with a 3-day lag (Tuesday data published Friday). Best used for weekly/monthly bias, not short-term trades.

**Tip:** Combine COT positioning with technical levels. If large specs are extremely long AND price hits major resistance → high-probability short setup.`,
        tags: ["forex", "COT", "institutional", "fundamental", "positioning"],
      },
    ],
  },
  {
    id: "fundamentals",
    label: "Economic Fundamentals",
    icon: "BarChart2",
    items: [
      {
        id: "nfp",
        title: "NFP — Non-Farm Payrolls",
        summary: "The most market-moving US economic report, released first Friday of each month.",
        content: `Non-Farm Payrolls (NFP) measures the number of jobs added or lost in the US economy (excluding farm workers, government, and some non-profit employees). Released the **first Friday of every month at 8:30 AM ET**.

## Why It Matters
The US Federal Reserve has a dual mandate: **price stability (inflation)** and **maximum employment**. NFP directly measures employment, so a strong reading = Fed may hike or hold rates = bullish USD. A weak reading = Fed may cut = bearish USD.

## Key Numbers to Watch
- **Headline number:** Jobs added (e.g. +220K)
- **Previous revision:** Last month's figure often gets revised — a big downward revision can override a good headline
- **Unemployment Rate:** The percentage (e.g. 3.9%)
- **Average Hourly Earnings:** Wage inflation  -  if wages rise, inflation follows, which is hawkish

## How the Market Reacts
| NFP Result | Typical USD Reaction |
|---|---|
| Much better than expected | USD surges |
| Slightly better | Modest USD buy |
| In-line | Muted reaction, focus on details |
| Slightly worse | Modest USD sell |
| Much worse | USD tanks |

## Trading NFP
1. **Before:** Spreads widen and liquidity thins. Avoid open positions 15-30 min before.
2. **The spike:** Initial reaction is often reversed within minutes (the "fakeout"). Don't chase.
3. **The real move:** Wait 5-15 minutes for the dust to settle, then look for momentum with confluence.
4. **Reversals:** A bad NFP after a strong USD week often triggers significant reversals.

**Pairs most affected:** EUR/USD, GBP/USD, USD/JPY, Gold (XAU/USD)`,
        tags: ["fundamentals", "NFP", "USD", "economic data"],
      },
      {
        id: "cpi-inflation",
        title: "CPI & Inflation Data",
        summary: "How Consumer Price Index readings move currency markets.",
        content: `The **Consumer Price Index (CPI)** measures the average price change in a basket of goods and services — the primary measure of inflation used by central banks.

## Why Traders Watch It
Inflation directly drives interest rate decisions. High inflation → central bank raises rates → currency strengthens. Low inflation (or deflation) → central bank cuts rates → currency weakens.

## Key CPI Metrics
- **Headline CPI:** Includes food and energy (more volatile)
- **Core CPI:** Excludes food and energy (more stable, watched more closely by central banks)
- **MoM (Month-over-Month):** Change vs previous month
- **YoY (Year-over-Year):** Change vs same month last year — the main benchmark

## Major CPI Releases by Country
| Report | Currency | Typical Release |
|---|---|---|
| US CPI | USD | Mid-month, 8:30 AM ET |
| UK CPI | GBP | Mid-month, 7:00 AM GMT |
| Eurozone CPI | EUR | End of month |
| Australia CPI | AUD | Quarterly |

## How the Market Reacts
- **CPI higher than expected** → hawkish pressure on central bank → currency bullish
- **CPI lower than expected** → dovish pressure → currency bearish
- **CPI in-line** → minimal reaction, market looks at next data point

## The Inflation Cycle
1. Economy grows → demand rises → prices rise (inflation up)
2. Central bank hikes rates to cool spending
3. Borrowing costs rise → economy slows → inflation falls
4. Central bank cuts rates → cycle restarts

**Tip:** CPI surprises (especially upside misses) can be more powerful movers than NFP on certain pairs. Always check the economic calendar for CPI dates.`,
        tags: ["fundamentals", "CPI", "inflation", "interest rates"],
      },
      {
        id: "economic-calendar-guide",
        title: "Reading the Economic Calendar",
        summary: "How to use high-impact events to plan your trading week.",
        content: `The economic calendar lists all scheduled data releases and events that can move markets. Every serious trader checks it weekly.

## Impact Levels
- 🔴 **High Impact** — Can cause significant volatility. Be in or out before release.
- 🟡 **Medium Impact** — Watch if it affects your traded pair
- ⚪ **Low Impact** — Usually ignored by most traders

## Key High-Impact Events to Know
| Event | Frequency | Affected Pairs |
|---|---|---|
| NFP (US Jobs) | Monthly | USD, Gold |
| CPI (Inflation) | Monthly | All USD pairs |
| FOMC Meeting | ~8x/year | All USD pairs |
| ECB Decision | ~8x/year | EUR pairs |
| BoE Decision | ~8x/year | GBP pairs |
| BoJ Decision | ~8x/year | JPY pairs |
| GDP Data | Quarterly | Respective currency |
| Retail Sales | Monthly | Respective currency |
| PMI Data | Monthly | Respective currency |

## Weekly Planning Routine
**Sunday evening:**
1. Check the week's calendar for red-folder events
2. Note which pairs you trade and when events hit
3. Decide if you'll trade through, avoid, or reduce size around events

**Before each high-impact event:**
1. Check current market expectations (consensus)
2. Know the previous reading
3. Have a plan for both scenarios (beat / miss)

## The "Buy the Rumour, Sell the News" Effect
Markets often price in expectations before the release. When the data matches what was expected, the move can reverse sharply as traders take profit. Be careful holding positions into announcements when positioning is already extreme.

**Tip:** A free economic calendar is available on Investing.com, Forex Factory, and Tradingview. Filter to high-impact events only to reduce noise.`,
        tags: ["fundamentals", "economic calendar", "events", "planning"],
      },
      {
        id: "interest-rates-markets",
        title: "Interest Rates & Markets",
        summary: "Why interest rates are the single most important macro driver in trading.",
        content: `Interest rates set by central banks ripple through every financial market  -  currencies, stocks, bonds, commodities, and crypto. Understanding them gives you macro context for your trades.

## The Basic Relationship
**Higher rates →**
- Borrowing is more expensive → businesses invest less → economy slows slightly
- Savings yield more → capital flows into that country's assets → currency appreciates
- Bond yields rise → bonds become more attractive → stocks may fall (higher discount rate on future earnings)

**Lower rates →**
- Cheap borrowing → businesses expand, consumers spend → economy stimulates
- Low savings return → capital seeks higher-yielding assets elsewhere → currency weakens
- Bond yields fall → stocks often rise as they become more attractive by comparison

## Rate Differentials Drive Forex
The biggest driver of long-term forex trends is the **interest rate differential** between two countries.

Example: If the Fed raises rates while the ECB holds, USD becomes more attractive → EUR/USD falls.

## The Yield Curve
The yield curve plots bond yields at different maturities (1Y, 2Y, 10Y, 30Y).
- **Normal:** Long-term yields higher than short-term (healthy economy)
- **Inverted:** Short-term yields above long-term → historically precedes recession

An inverted yield curve is a bearish signal for risk assets (stocks, commodity currencies) and often bullish for safe havens (USD, JPY, CHF, Gold).

## Real Rates vs Nominal Rates
**Real rate = Nominal rate − Inflation**

If a country has 5% interest rates but 6% inflation, the real rate is -1%. A negative real rate weakens a currency even if nominal rates look high.

**Gold** tends to rally when real rates are negative or falling — holding gold has no yield cost when rates are low.

**Tip:** Bookmark a "Global Interest Rates" chart and check where each major central bank stands relative to each other. This shapes the macro backdrop for your directional bias.`,
        tags: ["fundamentals", "interest rates", "macro", "bonds"],
      },
    ],
  },
  {
    id: "indicators-advanced",
    label: "Advanced Indicators",
    icon: "Activity",
    items: [
      {
        id: "atr",
        title: "ATR — Average True Range",
        summary: "Measure volatility and size your stops intelligently using ATR.",
        content: `The **Average True Range (ATR)** measures how much an asset moves on average over a given period. It tells you the volatility of the market  -  not direction, just size of moves.

## How It's Calculated
ATR averages the True Range over N periods (default: 14).
**True Range** = largest of:
- Current High − Current Low
- |Current High − Previous Close|
- |Current Low − Previous Close|

## Reading ATR
- A high ATR = market is volatile (big candles)
- A low ATR = market is quiet (small candles, consolidation)
- Rising ATR = volatility expanding (potential breakout or trend)
- Falling ATR = volatility contracting (consolidation, squeeze)

## Practical Uses

**1. Setting Stop Losses**
Never set stops at arbitrary pips. Use ATR:
- Stop = 1.0× to 1.5× ATR below entry (for longs)
- Gives price enough room to breathe without getting stopped out by normal noise

**2. Setting Take Profit**
If daily ATR = 80 pips and you enter mid-day, the pair may only have 40 pips left in its "daily range." Helps avoid overly ambitious targets.

**3. Comparing Markets**
Use ATR to compare volatility across pairs. GBP/JPY has a much higher ATR than EUR/CHF  -  this means larger stops and position size adjustments are needed.

**4. Breakout Confirmation**
A breakout accompanied by expanding ATR has more momentum behind it than a breakout on low ATR.

## ATR-Based Position Sizing
Position size = (Account Risk $) ÷ (ATR × Point Value)
This ensures every trade risks the same dollar amount regardless of the pair's volatility.`,
        tags: ["indicators", "ATR", "volatility", "stop loss"],
      },
      {
        id: "stochastic-rsi",
        title: "Stochastic RSI",
        summary: "A more sensitive oscillator for timing entries within overbought/oversold zones.",
        content: `**Stochastic RSI (StochRSI)** applies the Stochastic formula to RSI values rather than price. The result is a faster, more sensitive oscillator that cycles between 0 and 100 (or 0 and 1).

## How It Differs from RSI
- **RSI** measures price momentum — slow to signal, more reliable for major reversals
- **StochRSI** measures RSI's momentum — faster, more signals, better for fine-tuning entries

## Reading StochRSI
| Reading | Signal |
|---|---|
| Above 80 | Overbought — potential sell zone |
| Below 20 | Oversold — potential buy zone |
| Crosses above 20 from below | Bullish signal |
| Crosses below 80 from above | Bearish signal |
| %K crosses above %D | Bullish crossover |
| %K crosses below %D | Bearish crossover |

The two lines are %K (fast) and %D (smoothed version of %K).

## How to Use It

**Trend Entry Timing:**
In an uptrend, wait for StochRSI to dip to oversold (below 20), then look for %K to cross above %D as a buy trigger.

**Divergence:**
Price makes a new high but StochRSI makes a lower high → hidden bearish divergence → potential reversal.

**Avoid in Trending Markets:**
In a strong trend, StochRSI stays overbought or oversold for a long time. Don't fade a trend just because StochRSI is extreme  -  wait for a cross.

## Common Settings
- Length: 14 (RSI period)
- Stochastic Length: 14
- Smooth K: 3
- Smooth D: 3

**Best combined with:** RSI (for confirmation), Support/Resistance (for entry timing), Volume (for confirmation).`,
        tags: ["indicators", "stochastic", "RSI", "oscillator"],
      },
      {
        id: "vwap",
        title: "VWAP — Volume Weighted Average Price",
        summary: "The benchmark institutional traders use — and why price respects it.",
        content: `**VWAP** (Volume Weighted Average Price) is the average price a security has traded at throughout the day, weighted by volume. It resets every trading day.

## Why VWAP Matters
Institutions, funds, and market makers use VWAP as a benchmark. They aim to buy below VWAP and sell above it. Because of this, price frequently reacts at VWAP like support/resistance.

## Reading VWAP
- **Price above VWAP** → market is bullish intraday. Buyers in control. Longs favored.
- **Price below VWAP** → bearish intraday. Sellers in control. Shorts favored.
- **Price at VWAP** → contested zone. Watch for a bounce or break.

## VWAP as Support/Resistance
In trending days, price often:
1. Breaks above VWAP
2. Pulls back to test VWAP as support
3. Bounces and continues higher

This pullback-to-VWAP is a classic institutional entry pattern.

## Standard Deviation Bands
Many traders add ±1, ±2, ±3 standard deviation bands around VWAP. Price reaching ±2 or ±3 bands signals overextension and a potential reversion to VWAP.

## Anchored VWAP
Instead of a daily reset, Anchored VWAP starts from a specific point (earnings release, major low, key event). Used by swing traders to gauge institutional value area from that reference point.

## Best For
- Intraday trading (scalping, day trading)
- Identifying institutional entry zones
- Gauging whether price is "cheap" or "expensive" relative to volume

**Less useful for:** Swing traders and position traders (VWAP resets daily and loses context over longer periods).`,
        tags: ["indicators", "VWAP", "volume", "institutional", "intraday"],
      },
      {
        id: "ema-sma",
        title: "EMA vs SMA — Which to Use?",
        summary: "The key difference between exponential and simple moving averages and when each shines.",
        content: `Both EMA and SMA smooth out price to show the trend direction, but they calculate the "average" differently.

## Simple Moving Average (SMA)
Adds the last N closing prices and divides by N. Every period has equal weight.

**Example:** 10-period SMA = (sum of last 10 closes) ÷ 10

**Characteristics:**
- Smoother, less reactive to recent price
- Cleaner signals but slower to respond
- Better for identifying the big picture trend
- Popular settings: 50 SMA, 100 SMA, 200 SMA

## Exponential Moving Average (EMA)
Gives more weight to recent prices using an exponential multiplier.

**Characteristics:**
- Reacts faster to recent price moves
- More signals but more false signals in choppy markets
- Better for timing entries in a moving market
- Popular settings: 8 EMA, 20 EMA, 50 EMA, 200 EMA

## Side-by-Side Comparison
| Feature | SMA | EMA |
|---|---|---|
| Lag | More lag | Less lag |
| Sensitivity | Less sensitive | More sensitive |
| False signals | Fewer | More |
| Best for | Trend identification | Entry timing |
| Used by institutions | 50, 100, 200 SMA | 20, 50 EMA |

## The 200 MA — The Ultimate Trend Filter
- Price **above 200 SMA/EMA** → long-term uptrend → only look for longs
- Price **below 200 SMA/EMA** → long-term downtrend → only look for shorts
- Price **crossing the 200** → potential major trend change

## Golden Cross & Death Cross
- **Golden Cross:** 50 SMA crosses above 200 SMA → long-term bullish signal
- **Death Cross:** 50 SMA crosses below 200 SMA → long-term bearish signal

**Recommendation:** Use EMA for short-term momentum (8, 20 EMA on lower timeframes) and SMA for the big picture trend (50, 200 SMA on daily chart).`,
        tags: ["indicators", "EMA", "SMA", "moving averages", "trend"],
      },
    ],
  },
  {
    id: "smc-advanced",
    label: "ICT / SMC Advanced",
    icon: "Crosshair",
    items: [
      {
        id: "kill-zones",
        title: "Kill Zones",
        summary: "The specific session times when institutional orders flood the market.",
        content: `**Kill Zones** are specific time windows identified by ICT (Inner Circle Trader) when institutional order flow is highest. The majority of significant market moves happen within these windows.

## The Four Kill Zones (All Times in New York / ET)

**1. Asian Kill Zone**
🕐 20:00 – 00:00 ET (8 PM – Midnight)
- Sets the overnight range
- Often consolidation, building liquidity
- Watch for Midnight Open as a reference level

**2. London Open Kill Zone** ⭐⭐⭐
🕐 02:00 – 05:00 ET (2 AM – 5 AM)
- One of the most powerful sessions
- Liquidity from the Asian range often gets swept
- Major reversals and trend initiations
- GBP and EUR pairs most active

**3. New York Open Kill Zone** ⭐⭐⭐
🕐 07:00 – 10:00 ET (7 AM – 10 AM)
- Overlaps with London → highest liquidity
- Best session for volatile, directional moves
- NFP and major US data released at 8:30 AM ET
- All USD pairs + Gold most active

**4. New York Lunch / Afternoon**
🕐 13:00 – 16:00 ET (1 PM – 4 PM)
- Lower liquidity than morning
- Often sees reversals or consolidation
- Avoid trading 12:00–13:00 (lunch hour, choppy)

## How to Use Kill Zones
1. Mark your chart with vertical lines at Kill Zone open/close
2. Wait for price to reach a POI (point of interest: OB, FVG, liquidity level)
3. Look for entry confirmation during the Kill Zone window
4. Avoid taking new trades outside Kill Zones if you follow ICT methodology

**Best pairs per session:**
- London: EUR/USD, GBP/USD, GBP/JPY
- New York: EUR/USD, USD/JPY, XAU/USD`,
        tags: ["ICT", "SMC", "kill zones", "sessions", "time"],
      },
      {
        id: "power-of-3",
        title: "Power of 3 (PO3)",
        summary: "ICT's model of how institutional algorithms accumulate, manipulate, then distribute.",
        content: `**Power of 3 (PO3)** is an ICT concept describing how institutional algorithms engineer price movement in three phases: Accumulation → Manipulation → Distribution.

## The Three Phases

**1. Accumulation**
Smart money builds their position quietly during a low-volatility period (usually the Asian session or pre-market). Price ranges tightly, building liquidity on both sides.

**2. Manipulation (The Judas Swing)**
Price makes a false move in the OPPOSITE direction of the intended move. This:
- Triggers stop losses of early traders
- Creates liquidity for institutions to fill large orders
- Traps retail traders on the wrong side

If the real move is bullish, price first dips below the Asian range low (sweeping sell-stop liquidity) before reversing.

**3. Distribution**
The actual directional move happens. Price moves toward the real target (premium/discount array). This is when retail traders who weren't trapped start chasing — often near the end of the move.

## Daily PO3 Example
1. **Asian session (00:00–08:00 ET):** Accumulation. Price ranges tightly.
2. **London open (02:00–05:00 ET):** Manipulation. Price dips below Asian low → sweeps stops.
3. **New York open (07:00–10:00 ET):** Distribution. Price reverses and rallies through the Asian high.

## Weekly PO3
Same concept on a weekly scale:
- **Monday/Tuesday:** Accumulation and manipulation (often Monday gives a false move)
- **Wednesday–Thursday:** The real directional move of the week
- **Friday:** Distribution and partial retracement before close

## Practical Application
1. Identify the likely direction (HTF bias)
2. During London, watch for manipulation (stop sweep) of the Asian range
3. Wait for the manipulation to complete (displacement candle away from the swept level)
4. Enter during New York open in the direction of the real move`,
        tags: ["ICT", "SMC", "power of 3", "PO3", "manipulation"],
      },
      {
        id: "ote",
        title: "Optimal Trade Entry (OTE)",
        summary: "ICT's Fibonacci-based entry zone for joining institutional order flow.",
        content: `**Optimal Trade Entry (OTE)** is an ICT concept that uses Fibonacci retracements to define the premium zone where institutions re-enter after an initial displacement move.

## The OTE Zone
After a significant impulse move (displacement), price retraces. The OTE is found between the **61.8% and 79% Fibonacci retracement levels** of that impulse.

Why this range? Institutional algorithms are programmed to accumulate positions in this zone — it represents "fair value" relative to the swing after a large move.

## How to Identify an OTE Setup

**For Bullish OTE:**
1. Identify a clear bullish impulse (swing low → swing high)
2. Draw Fib from swing low (0%) to swing high (100%)
3. Wait for price to retrace into the 61.8%–79% zone
4. Look for confluence: FVG, Order Block, or liquidity level in that zone
5. Enter long with stop below the swing low

**For Bearish OTE:**
1. Identify a clear bearish impulse (swing high → swing low)
2. Draw Fib from swing high (0%) to swing low (100%)
3. Wait for retracement into 61.8%–79% zone
4. Look for confluence: Bearish OB or FVG in that zone
5. Enter short with stop above swing high

## Key Fibonacci Levels
| Level | Meaning |
|---|---|
| 0% | Start of move |
| 38.2% | Shallow retracement — trend very strong |
| 50% | Mid-point — common retracement |
| 61.8% | OTE zone begins |
| 70.5% | ICT's "sweet spot" |
| 79% | OTE zone ends |
| 100% | Full retracement — impulse negated |

## OTE + Kill Zone
The most powerful setup: price retraces to OTE zone during a Kill Zone. The combination of time and price confluence significantly increases probability.

**Tip:** Not every retracement into the OTE zone is a valid trade. Always require additional confluence (OB, FVG, liquidity sweep) before entering.`,
        tags: ["ICT", "SMC", "OTE", "fibonacci", "entry"],
      },
      {
        id: "institutional-candles",
        title: "Institutional Candles",
        summary: "How to spot the candles that signal real institutional participation.",
        content: `**Institutional candles** (sometimes called displacement candles or mitigation candles) are large, aggressive candles that signal genuine smart money participation rather than retail noise.

## Characteristics of Institutional Candles
- **Large body** relative to recent candles (3–5× the average candle size)
- **Minimal wicks** — the move is clean and decisive, not sloppy
- **Closes near its high/low** — sustained pressure, not just a wick
- **Breaks through multiple levels** — cuts through S/R, previous highs/lows, or MA levels
- **Accompanied by volume spike** (on instruments where volume is visible)

## Why They Matter
When institutions execute large orders, they leave imprints in price data:
1. The big candle itself (the displacement)
2. A Fair Value Gap (FVG) — the gap created between the previous candle's high and the next candle's low
3. An imbalance in price that often gets "filled" on a retracement

## Types of Institutional Candles

**Bullish Institutional Candle:**
Large green candle, closes near high, breaks above recent resistance. Creates an upward FVG.

**Bearish Institutional Candle:**
Large red candle, closes near low, breaks below recent support. Creates a downward FVG.

**Rejection Candle:**
Large candle that reverses and closes in the opposite direction — a trap for traders who chased the initial direction.

## Using Them in Trading

**Step 1:** Spot the institutional candle that started a significant move
**Step 2:** Identify the FVG or OB left behind
**Step 3:** Wait for price to retrace to that zone
**Step 4:** Enter in the direction of the original institutional move

The logic: institutions couldn't fill all their orders in one candle, so they wait for price to return to their zone before adding more.

**Caution:** A big candle alone doesn't make it institutional. It needs to break structure, leave an imbalance, and be in context with the higher timeframe bias.`,
        tags: ["ICT", "SMC", "institutional", "candles", "displacement"],
      },
    ],
  },
  {
    id: "strategies-advanced",
    label: "Trading Styles & Strategies",
    icon: "TrendingUp",
    items: [
      {
        id: "scalping",
        title: "Scalping",
        summary: "High-frequency, short-duration trading targeting small but frequent profits.",
        content: `**Scalping** involves taking many small trades (seconds to minutes) to accumulate small profits that add up. Scalpers target 3–15 pips per trade with tight stop losses.

## Key Characteristics
- **Timeframes:** 1M, 3M, 5M charts
- **Hold time:** Seconds to 10 minutes
- **Target per trade:** 3–15 pips
- **Stop loss:** 3–10 pips
- **Trades per day:** 5–30+
- **Win rate needed:** High (60-70%+) due to small R:R

## What Makes a Good Scalper
1. **Low spread broker** — critical. Even 1 pip spread on a 5-pip target is 20% of your profit
2. **Fast execution** — market orders, no requotes
3. **Focus and discipline** — must cut losses fast, no hoping
4. **Pattern recognition** — reading order flow, tape, or key levels quickly

## Scalping Strategies

**Level Scalping:**
Set alerts at key S/R levels. When price touches, look for rejection candle and enter immediately with tight stop.

**EMA Bounce Scalping:**
Use 8 EMA + 20 EMA on 5M chart. In an uptrend, buy bounces off the 8 EMA. Exit when momentum stalls.

**Order Flow Scalping:**
On liquid assets, read the bid/ask and tape. Enter when you see large bids being hit or large offers absorbed.

## Pros of Scalping
- Many opportunities per day
- Small drawdowns (tight stops)
- No overnight risk
- Quick feedback loop (learn fast)

## Cons of Scalping
- Spread and commissions eat profits — need low-cost broker
- Mentally exhausting
- Slippage in fast markets
- Requires significant screen time

**Who it suits:** Disciplined, patient people who can follow rules without hesitation. Not recommended for beginners — master a higher timeframe first.`,
        tags: ["strategies", "scalping", "day trading", "1M", "5M"],
      },
      {
        id: "swing-vs-day",
        title: "Swing Trading vs Day Trading",
        summary: "The key differences, pros, cons, and which style suits you.",
        content: `Choosing the right trading style is as important as choosing the right strategy. Your lifestyle, personality, and schedule all influence which approach suits you best.

## Day Trading
Positions opened and closed within the same trading day. No overnight holds.

**Timeframes:** 5M, 15M, 1H
**Hold time:** Minutes to hours
**Required screen time:** 4–8 hours/day active monitoring

**Pros:**
- No overnight gap risk
- Quick results and feedback
- More trading opportunities per week

**Cons:**
- Requires dedicated time blocks
- Emotionally demanding
- Spread/commission costs add up
- Difficult to hold a regular job alongside

## Swing Trading
Positions held for 1 day to several weeks, capturing a "swing" in price.

**Timeframes:** 4H, Daily, Weekly
**Hold time:** 1–10 days typically
**Required screen time:** 30–60 min/day

**Pros:**
- Compatible with a full-time job
- Less screen time
- Bigger moves = bigger R:R potential
- Less emotional (not watching every tick)

**Cons:**
- Overnight swap costs (can be positive or negative)
- Gap risk (price opens differently than it closed)
- Fewer setups per week
- Need patience — trades take days to play out

## Which Style Suits You?

| If you… | Consider… |
|---|---|
| Have a job / limited time | Swing trading |
| Can watch charts 4+ hours/day | Day trading |
| Are emotional / impatient | Swing trading |
| Are disciplined and fast | Day trading or scalping |
| Prefer few high-quality setups | Swing trading |
| Like frequent action | Day trading |

## Position Trading (Bonus)
Hold for weeks to months. Only a few trades per year. Purely fundamental + weekly technical. Best for those who want minimal active management.

**Recommendation:** Start with swing trading on the 4H/Daily chart. It gives you time to think, reduces emotional pressure, and lets you learn at a sustainable pace.`,
        tags: ["strategies", "swing trading", "day trading", "style"],
      },
      {
        id: "ict-model",
        title: "The ICT Trading Model",
        summary: "A complete framework combining SMC, kill zones, and price delivery for high-probability setups.",
        content: `The **ICT Trading Model** (developed by Michael Huddleston, known as "Inner Circle Trader") is a complete trading methodology based on how institutional algorithms deliver price. It combines market structure, time-based analysis, and specific price levels.

## The Core Components

**1. Higher Timeframe Bias (HTF)**
Start with the Weekly and Daily chart. Determine if price is in a bullish or bearish market structure (series of HH/HL or LH/LL). This is your directional bias. Only take trades in this direction.

**2. Draw on Liquidity**
Where is price likely heading? Identify:
- Previous highs/lows (buy-side and sell-side liquidity)
- Imbalances (FVGs) that need to be filled
- Premium/Discount arrays (where price is "expensive" or "cheap")

**3. Wait for a Kill Zone**
Only look for entries during London or New York Kill Zones. This is when institutional algorithms are active.

**4. Look for Manipulation (Stop Sweep)**
Before the real move, price often sweeps a liquidity level in the opposite direction. This is the Judas Swing. Wait for this to happen.

**5. Confirm with Lower Timeframe**
After the sweep, drop to 5M or 15M. Look for:
- Market structure shift (first LH in a downtrend before reversal, or first HH in uptrend)
- FVG or OB at the OTE zone
- Displacement candle away from the swept level

**6. Execute with Precision**
Enter at the FVG or OB. Stop below the swept liquidity. Target the opposite liquidity pool.

## The ICT Daily Routine
1. **Sunday:** Analyze weekly chart, note HTF bias and key levels
2. **Daily:** Analyze daily chart, update bias, note POIs
3. **Pre-session:** Mark 4H POIs, set alerts
4. **During Kill Zone:** Drop to 5M/15M for entry

## The ICT Narrative
Always ask: "What story is price telling?" Are they running sell stops before a bullish move? Building premium before a distribution? The narrative should make sense before you enter.

**Tip:** Focus on one concept at a time. Many traders spend months mastering just Kill Zones + FVGs before adding more complexity.`,
        tags: ["ICT", "SMC", "model", "strategy", "institutional"],
      },
    ],
  },
  {
    id: "risk-advanced",
    label: "Advanced Risk Management",
    icon: "ShieldCheck",
    items: [
      {
        id: "correlation-risk",
        title: "Correlation Risk",
        summary: "Why trading correlated pairs simultaneously multiplies your real risk.",
        content: `Correlation risk is one of the most overlooked dangers for retail traders. It occurs when you hold multiple positions that move together — effectively making one large bet disguised as multiple smaller ones.

## How Correlation Multiplies Risk
If you risk 1% on EUR/USD long and 1% on GBP/USD long simultaneously, and USD suddenly strengthens, **both positions lose at the same time**. Your actual risk isn't 1% — it's closer to 2% on a single "USD weakens" bet.

## Measuring Correlation
Correlation is measured from -1 to +1:
- **+1.0:** Perfect positive correlation (move together)
- **0:** No correlation
- **-1.0:** Perfect negative correlation (move opposite)

Strong correlation: |r| > 0.7
Moderate: |r| 0.4–0.7

## Common High-Correlation Pairs
| Pair A | Pair B | Correlation |
|---|---|---|
| EUR/USD | GBP/USD | ~+0.85 |
| AUD/USD | NZD/USD | ~+0.90 |
| EUR/USD | USD/CHF | ~-0.90 |
| USD/JPY | USD/CHF | ~+0.75 |

## Managing Correlation Risk

**Rule 1: Count correlated positions as one**
If EUR/USD and GBP/USD are both long, your total risk allocation should be 1% split between them, not 1% each.

**Rule 2: Hedge intentionally**
Going long EUR/USD and long USD/CHF is roughly a neutral trade (they cancel out). Only do this intentionally.

**Rule 3: Check correlations change**
Correlations shift during major events. Safe-haven flows can break normally positive correlations. Recheck during high-impact news.

**Rule 4: Portfolio view**
Before adding any new trade, ask: what is my total effective exposure to each currency? USD, EUR, JPY, etc.

**Practical Check:** List all open positions. If you have 3 USD-bearish positions each at 1%, you have 3% effective risk on USD weakness — well above your per-trade limit.`,
        tags: ["risk management", "correlation", "portfolio", "exposure"],
      },
      {
        id: "multi-position",
        title: "Managing Multiple Positions",
        summary: "Rules for scaling in, partial profits, and managing a portfolio of open trades.",
        content: `As your experience grows, you'll often have multiple trades open simultaneously. Managing them well is its own skill.

## Maximum Open Positions
Set a hard cap on how many trades you hold simultaneously. Recommended limits:
- **Beginners:** 1–2 max
- **Intermediate:** 3–5 max
- **Advanced:** Based on portfolio correlation analysis

More positions = more to monitor, more cognitive load, more risk of correlation overlap.

## Scaling In (Adding to Winners)
Adding to a winning position increases your position size while the trade moves in your favor.

**Rules for scaling in:**
1. Only add after the trade is in profit (ideally at breakeven stop or better)
2. Each additional entry must have its own valid reason (new OB, FVG, pullback to level)
3. Reduce size on subsequent entries (1st entry: 1%, 2nd: 0.5%, 3rd: 0.25%)
4. Move stop on all positions to protect the whole trade

**Never average down into losing trades.** That's a loser's game.

## Partial Take Profits
Take a portion of your position at intermediate targets, let the rest run.

**Example setup:**
- Entry: 1.0850
- TP1 at 1.0900 → close 50% of position
- Move stop to breakeven on remaining
- TP2 at 1.0980 → close remaining

This locks in profits, removes pressure, and lets winners run.

## Breakeven Stop Management
Once price has moved 1× your risk in profit, move stop to entry price (breakeven). This makes the trade risk-free.

**Timing:** Don't move to breakeven too early — you'll get stopped out by normal retracements before the trade has room to breathe.

## Portfolio Daily Loss Limit
Set a maximum daily drawdown across all positions:
- If total open P&L hits -3%, close everything and stop for the day
- Prevents one bad day from destroying a week of work
- Stick to this rule even if you're "sure" the market will reverse

## End-of-Day Checklist
1. Where are all stops? Are any too tight?
2. What's my total exposure per currency?
3. Any high-impact news tomorrow that affects open trades?
4. Am I overexposed in any correlated pair cluster?`,
        tags: ["risk management", "position management", "scaling", "partial profit"],
      },
    ],
  },
  {
    id: "psychology-advanced",
    label: "Advanced Psychology",
    icon: "Brain",
    items: [
      {
        id: "fomo-revenge",
        title: "FOMO & Revenge Trading",
        summary: "The two most costly emotional mistakes — and how to break the cycle.",
        content: `**FOMO (Fear of Missing Out)** and **Revenge Trading** are responsible for more blown accounts than any technical mistake. They're emotional responses that override logic.

## FOMO — Fear of Missing Out

**What it looks like:**
- You see a big candle already moving 50 pips. You chase it and enter late.
- You skip your planned setup because "it already moved" and then regret it.
- You take every trade because "this might be the big move."

**Why it's dangerous:**
- You enter at the worst possible price (late, near resistance/target)
- Your risk:reward is destroyed (entry too far from stop, too close to target)
- If it reverses, you take a full loss while the patient trader is still near breakeven

**The Fix:**
1. **Accept that you will miss trades.** There is always another setup. The market never closes forever.
2. **Set alerts at your levels.** Don't stare at charts watching moves happen — you'll FOMO.
3. **Journal every FOMO trade.** You'll quickly see they almost always lose.
4. **If you missed it, mark the level and wait for a retest.** The retest is often the better entry anyway.

## Revenge Trading

**What it looks like:**
- You take a loss. You immediately jump back in trying to "make it back."
- You increase your position size after a loss.
- You override your setup rules because you're angry.

**Why it's dangerous:**
- You're trading emotion, not analysis. Your judgment is compromised.
- Larger size after a loss can turn a 1% loss into a 5% loss.
- One revenge trade becoming a series of losses = account destruction.

**The Fix:**
1. **Mandatory pause after a loss.** Minimum 10–30 minutes. Walk away from screens.
2. **Set a daily loss limit.** 3% down → close laptop, done for the day. No exceptions.
3. **Write down how you feel immediately after the loss.** This awareness breaks the autopilot.
4. **Ask:** "Would I take this trade if I hadn't just lost?" If no, don't take it.

## Breaking the Cycle
Both FOMO and revenge trading come from the same root: **emotional attachment to money**.

Reframe: Each trade is just one of the next 100 trades. One loss is statistically irrelevant. One missed move is statistically irrelevant. Your edge plays out over hundreds of trades — not one.`,
        tags: ["psychology", "FOMO", "revenge trading", "emotions", "discipline"],
      },
      {
        id: "discipline-routine",
        title: "Discipline & Daily Routine",
        summary: "Building the habits and systems that make consistent trading possible.",
        content: `Discipline in trading isn't willpower — it's systems. The goal is to remove reliance on motivation and replace it with process.

## The Pre-Session Routine

**30–60 minutes before your session:**
1. **Physical state:** Eat, hydrate. Don't trade hungry, tired, or stressed.
2. **Market context:** Check overnight moves, news for the session, HTF chart update.
3. **Mark levels:** Identify key POIs, set price alerts. Know your plan before price gets there.
4. **Define your trading window:** Decide exactly which Kill Zone / session you're trading today.
5. **Set your risk limit:** Today's max loss. If hit, session ends.

## During the Session

**What to do:**
- Wait at your levels. The chart is boring most of the time — that's fine.
- When a setup forms, execute without hesitation (analysis paralysis is also a problem).
- Set your stop and take profit at entry, then walk away.

**What not to do:**
- Don't move your stop loss further (hoping trades come back)
- Don't add to losing trades
- Don't close winning trades early out of fear
- Don't take "bonus" trades outside your setup criteria

## Post-Session Routine
1. Screenshot every trade (entry, management, exit)
2. Journal: What was the setup? What went right? What went wrong?
3. Review P&L — not to feel good or bad, but to identify patterns
4. Close the charts. The session is over.

## Weekly Review (Sunday or Friday Evening)
- Review all trades from the week
- Calculate win rate, average R:R, biggest winner/loser
- Identify one thing to improve next week
- Check upcoming economic calendar

## Signs of Good Discipline
✓ You can watch a setup fail to form and walk away
✓ You take losses without immediately wanting to trade again
✓ Your trade size is consistent regardless of emotion
✓ You stick to your session window even when the market "looks good" outside it
✓ You journal every single trade, wins and losses alike

## Building the Habit
New habits take 30–90 days to form. Use a simple checklist before each session. Tick each box. Over time, it becomes automatic.

**The compound effect:** A trader who executes their plan at 80% consistency for one year will outperform a genius who trades 100% on emotion.`,
        tags: ["psychology", "discipline", "routine", "habits", "consistency"],
      },
    ],
  },
];
