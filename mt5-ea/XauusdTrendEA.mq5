//+------------------------------------------------------------------+
//|                                               XauusdTrendEA.mq5   |
//|                                          Tradex Terminal Project  |
//|                                                                  |
//|  Trend-following Expert Advisor tuned for XAUUSD (Gold).          |
//|                                                                  |
//|  Strategy summary                                                |
//|  ----------------                                                |
//|  * Trend direction is defined by a fast/slow EMA relationship on  |
//|    the working timeframe, confirmed by a higher timeframe EMA.    |
//|  * Entries are taken on EMA crossovers in the direction of the    |
//|    higher-timeframe trend, filtered by ADX strength and RSI to    |
//|    avoid chop and over-extended pushes.                           |
//|  * Risk is sized from account equity using the ATR-based stop     |
//|    distance, so position size adapts to gold's volatility.        |
//|  * Stops/targets are ATR multiples, with an optional ATR          |
//|    trailing stop and break-even move.                             |
//|                                                                  |
//|  NOTE: Educational template. Always test on a demo account and    |
//|  optimise inputs in the Strategy Tester before any live use.      |
//+------------------------------------------------------------------+
#property copyright "Tradex Terminal"
#property link      "https://tradex.terminal"
#property version   "1.00"
#property strict
#property description "Trend-following EA tuned for XAUUSD (Gold). EMA + ADX + RSI with ATR risk management."

#include <Trade/Trade.mqh>
#include <Trade/PositionInfo.mqh>
#include <Trade/SymbolInfo.mqh>

//--- Trade objects
CTrade        trade;
CPositionInfo position;
CSymbolInfo   symInfo;

//+------------------------------------------------------------------+
//| Inputs                                                           |
//+------------------------------------------------------------------+
input group "=== General ==="
input long     InpMagicNumber       = 26061300;   // Magic number (unique per chart)
input string   InpTradeComment      = "XauusdTrendEA"; // Order comment
input bool     InpTradeOnNewBarOnly = false;       // Evaluate only on new bar (false = intrabar breakout entries)

input group "=== Strategy: Donchian Breakout (backtested) ==="
// Channel-breakout trend following. In a 10-year H1 XAUUSD backtest this
// edge held up out-of-sample (PF ~1.5, both halves profitable). See README.
input int      InpDonchianPeriod    = 40;          // Donchian lookback (bars) for breakout level
input int      InpTrendEmaPeriod    = 200;         // Trend filter EMA (working TF): long above, short below
input bool     InpUseAdxFilter      = false;       // Optional ADX trend-strength filter
input int      InpAdxPeriod         = 14;          // ADX period (if filter on)
input double   InpAdxMinStrength    = 20.0;        // Minimum ADX when filter on

input group "=== Risk Management ==="
input double   InpRiskPercent       = 1.0;         // Risk per trade (% of equity)
input double   InpFixedLot          = 0.0;         // Fixed lot (>0 overrides risk %)
input int      InpAtrPeriod         = 14;          // ATR period for stops/sizing
input double   InpAtrSlMult         = 2.0;         // Stop-loss = ATR * this
input double   InpAtrTpMult         = 0.0;         // Take-profit = ATR * this (0 = none; let trailing run)
input int      InpMaxOpenPositions  = 1;           // Max simultaneous EA positions

input group "=== Trailing / Break-even ==="
input bool     InpUseBreakEven      = false;       // Move stop to break-even (off: let trailing manage)
input double   InpBreakEvenAtrMult  = 1.0;         // Profit (ATR) to trigger break-even
input double   InpBreakEvenLockAtr  = 0.1;         // ATR locked beyond entry at BE
input bool     InpUseTrailing       = true;        // Use ATR trailing stop (core of the edge)
input double   InpTrailAtrMult      = 3.0;         // Trailing distance = ATR * this

input group "=== Filters ==="
input double   InpMaxSpreadPoints   = 50.0;        // Max spread (points) to allow entry; 0 = ignore
input bool     InpUseSessionFilter  = true;        // Restrict trading hours (server time)
input int      InpSessionStartHour  = 8;           // Session start hour (0-23) - London open
input int      InpSessionEndHour    = 20;          // Session end hour (0-23) - before US close
input int      InpMaxSlippagePoints = 30;          // Max deviation/slippage (points)
input int      InpMinBarsBetweenTrades = 3;        // Min bars to wait after closing before re-entry

input group "=== Capital Protection (read the README!) ==="
input bool     InpUseDailyLossLimit = true;        // Stop trading after a daily loss cap
input double   InpDailyLossPercent  = 4.0;         // Daily loss limit (% of day-start equity)
input bool     InpUseMaxDrawdown    = true;        // Halt EA on equity drawdown from peak
input double   InpMaxDrawdownPercent = 15.0;       // Max equity drawdown from peak (%)
input bool     InpCloseOnDrawdown   = true;        // Close all EA trades when DD halt fires
input int      InpMaxTradesPerDay   = 5;           // Max new trades per day (0 = unlimited)
input bool     InpFridayClose       = true;        // Close all & stop before the weekend
input int      InpFridayCloseHour   = 21;          // Friday hour (server) to flatten/stop
input bool     InpAvoidMondayOpen   = true;        // Skip first hour after weekend gap
input int      InpMondayOpenHour    = 0;           // Server hour the trading week opens

//+------------------------------------------------------------------+
//| Globals                                                          |
//+------------------------------------------------------------------+
int      hTrendEma = INVALID_HANDLE;
int      hAdx      = INVALID_HANDLE;
int      hAtr      = INVALID_HANDLE;

datetime lastBarTime = 0;

// --- Capital-protection / state tracking ---
datetime currentDay      = 0;      // server date of the running session day
double   dayStartEquity  = 0.0;    // equity at the start of the trading day
int      tradesToday     = 0;      // new EA trades opened today
double   equityPeak      = 0.0;    // running peak equity for drawdown calc
bool     ddHalted        = false;  // true once max-drawdown halt has fired
bool     dailyLossHit    = false;  // true once daily loss cap is reached
datetime lastCloseBar    = 0;      // bar time of the most recent EA position close
int      prevEaPositions = 0;      // EA position count on the previous tick

//+------------------------------------------------------------------+
//| Expert initialization                                            |
//+------------------------------------------------------------------+
int OnInit()
  {
   if(!symInfo.Name(_Symbol))
     {
      Print("ERROR: cannot select symbol ", _Symbol);
      return(INIT_FAILED);
     }

   // Friendly warning if the EA is not running on a gold symbol.
   if(StringFind(_Symbol, "XAU") < 0)
      Print("WARNING: this EA is tuned for XAUUSD; current symbol is ", _Symbol);

   // Validate inputs that could break the logic.
   if(InpDonchianPeriod < 2)
     {
      Print("ERROR: Donchian period must be >= 2.");
      return(INIT_PARAMETERS_INCORRECT);
     }
   if(InpRiskPercent <= 0.0 && InpFixedLot <= 0.0)
     {
      Print("ERROR: Set either a positive Risk % or a Fixed lot.");
      return(INIT_PARAMETERS_INCORRECT);
     }

   // Create indicator handles.
   hTrendEma = iMA(_Symbol, _Period, InpTrendEmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   hAtr      = iATR(_Symbol, _Period, InpAtrPeriod);
   if(InpUseAdxFilter)
      hAdx   = iADX(_Symbol, _Period, InpAdxPeriod);

   if(hTrendEma == INVALID_HANDLE || hAtr == INVALID_HANDLE ||
      (InpUseAdxFilter && hAdx == INVALID_HANDLE))
     {
      Print("ERROR: failed to create one or more indicator handles.");
      return(INIT_FAILED);
     }

   // Configure trade helper.
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpMaxSlippagePoints);
   trade.SetTypeFillingBySymbol(_Symbol);
   trade.SetAsyncMode(false);

   // Initialise capital-protection state.
   dayStartEquity = AccountInfoDouble(ACCOUNT_EQUITY);
   equityPeak     = dayStartEquity;
   currentDay     = DayStart(TimeCurrent());

   Print("XauusdTrendEA initialised on ", _Symbol, " ", EnumToString((ENUM_TIMEFRAMES)_Period));
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization                                          |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   if(hTrendEma != INVALID_HANDLE) IndicatorRelease(hTrendEma);
   if(hAdx      != INVALID_HANDLE) IndicatorRelease(hAdx);
   if(hAtr      != INVALID_HANDLE) IndicatorRelease(hAtr);
  }

//+------------------------------------------------------------------+
//| Expert tick                                                      |
//+------------------------------------------------------------------+
void OnTick()
  {
   // Roll daily counters and update the equity peak first.
   UpdateDailyState();
   UpdateEquityPeak();
   TrackPositionCloses();

   // Manage open positions every tick for responsive trailing/BE.
   ManageOpenPositions();

   // --- Hard capital-protection halts ---
   if(InpUseMaxDrawdown && CheckMaxDrawdown())
      return;                                  // EA halted for the session

   if(InpFridayClose && IsWeekendFlattenTime())
     {
      CloseAllEaPositions("Friday close");
      return;
     }

   if(InpUseDailyLossLimit && CheckDailyLossLimit())
      return;                                  // no new trades until next day

   // New-bar gate for entry evaluation.
   if(InpTradeOnNewBarOnly && !IsNewBar())
      return;

   // --- Soft entry filters ---
   if(InpUseSessionFilter && !WithinSession())
      return;

   if(InpAvoidMondayOpen && IsMondayOpenWindow())
      return;

   if(InpMaxTradesPerDay > 0 && tradesToday >= InpMaxTradesPerDay)
      return;

   // Cooldown after a recent close to avoid immediate re-entry on the same swing.
   if(InpMinBarsBetweenTrades > 0 && lastCloseBar > 0)
     {
      int barsSince = iBarShift(_Symbol, _Period, lastCloseBar, false);
      if(barsSince < InpMinBarsBetweenTrades)
         return;
     }

   // Respect the position cap.
   if(CountEaPositions() >= InpMaxOpenPositions)
      return;

   int signal = GetSignal();   // +1 buy, -1 sell, 0 none
   if(signal == 0)
      return;

   if(!SpreadOk())
     {
      Print("Entry skipped: spread too wide.");
      return;
     }

   bool opened;
   if(signal > 0)
      opened = OpenTrade(ORDER_TYPE_BUY);
   else
      opened = OpenTrade(ORDER_TYPE_SELL);

   if(opened)
      tradesToday++;
  }

//+------------------------------------------------------------------+
//| Detect a new bar on the working timeframe                        |
//+------------------------------------------------------------------+
bool IsNewBar()
  {
   datetime t = iTime(_Symbol, _Period, 0);
   if(t != lastBarTime)
     {
      lastBarTime = t;
      return(true);
     }
   return(false);
  }

//+------------------------------------------------------------------+
//| Generate entry signal — Donchian channel breakout (intrabar)     |
//|   Returns +1 (buy), -1 (sell) or 0 (no trade).                   |
//|                                                                  |
//|   The channel is built from the last InpDonchianPeriod CLOSED     |
//|   bars (shift 1..N), so it is fixed while the current bar forms.  |
//|   We then enter the moment price trades through that level,       |
//|   which reproduces a stop-order breakout fill — the entry style   |
//|   that actually held up out-of-sample in testing (see README).   |
//|   A close-bar entry was materially weaker, so we trade intrabar.  |
//|                                                                  |
//|   Trend gate: the previous bar must close on the correct side of  |
//|   the trend EMA (EMA200 by default).                              |
//+------------------------------------------------------------------+
int GetSignal()
  {
   double ema[1];
   if(CopyBuffer(hTrendEma, 0, 1, 1, ema) < 1)
      return(0);
   double trendEma = ema[0];

   // Optional ADX trend-strength filter.
   if(InpUseAdxFilter)
     {
      double adx[1];
      if(CopyBuffer(hAdx, 0, 1, 1, adx) < 1)
         return(0);
      if(adx[0] < InpAdxMinStrength)
         return(0);
     }

   // Donchian channel over the last N closed bars (shift 1..N).
   int hiShift = iHighest(_Symbol, _Period, MODE_HIGH, InpDonchianPeriod, 1);
   int loShift = iLowest(_Symbol, _Period, MODE_LOW,  InpDonchianPeriod, 1);
   if(hiShift < 0 || loShift < 0)
      return(0);

   double donHigh = iHigh(_Symbol, _Period, hiShift);
   double donLow  = iLow(_Symbol, _Period, loShift);
   double close1  = iClose(_Symbol, _Period, 1);   // last closed bar (trend gate)

   symInfo.RefreshRates();
   double ask = symInfo.Ask();
   double bid = symInfo.Bid();

   // Long: price breaks above the upper channel, prior close above the EMA.
   if(ask > donHigh && close1 > trendEma)
      return(1);

   // Short: price breaks below the lower channel, prior close below the EMA.
   if(bid < donLow && close1 < trendEma)
      return(-1);

   return(0);
  }

//+------------------------------------------------------------------+
//| Open a trade with ATR-based SL/TP and risk-based sizing          |
//+------------------------------------------------------------------+
bool OpenTrade(const ENUM_ORDER_TYPE type)
  {
   double atr = GetAtr();
   if(atr <= 0.0)
     {
      Print("Entry skipped: invalid ATR.");
      return(false);
     }

   symInfo.RefreshRates();
   double price = (type == ORDER_TYPE_BUY) ? symInfo.Ask() : symInfo.Bid();

   double slDist = atr * InpAtrSlMult;
   double tpDist = (InpAtrTpMult > 0.0) ? atr * InpAtrTpMult : 0.0;

   double sl, tp;
   if(type == ORDER_TYPE_BUY)
     {
      sl = price - slDist;
      tp = (tpDist > 0.0) ? price + tpDist : 0.0;
     }
   else
     {
      sl = price + slDist;
      tp = (tpDist > 0.0) ? price - tpDist : 0.0;
     }

   sl = NormalizeDouble(sl, _Digits);
   tp = NormalizeDouble(tp, _Digits);

   // Respect broker minimum stop distance.
   if(!StopsRespectMinDistance(type, price, sl, tp))
     {
      Print("Entry skipped: SL/TP closer than broker minimum stop level.");
      return(false);
     }

   double lots = CalculateLotSize(slDist);
   if(lots <= 0.0)
     {
      Print("Entry skipped: computed lot size is zero.");
      return(false);
     }

   bool ok;
   if(type == ORDER_TYPE_BUY)
      ok = trade.Buy(lots, _Symbol, 0.0, sl, tp, InpTradeComment);
   else
      ok = trade.Sell(lots, _Symbol, 0.0, sl, tp, InpTradeComment);

   if(!ok)
     {
      PrintFormat("Order failed: retcode=%d (%s)", trade.ResultRetcode(), trade.ResultRetcodeDescription());
      return(false);
     }

   PrintFormat("%s %.2f lots @ %.2f  SL=%.2f TP=%.2f  ATR=%.2f",
               (type == ORDER_TYPE_BUY ? "BUY" : "SELL"), lots, price, sl, tp, atr);
   return(true);
  }

//+------------------------------------------------------------------+
//| Position sizing from risk % and stop distance (price units)      |
//+------------------------------------------------------------------+
double CalculateLotSize(const double stopDistancePrice)
  {
   // Fixed lot override.
   if(InpFixedLot > 0.0)
      return(NormalizeLot(InpFixedLot));

   double equity       = AccountInfoDouble(ACCOUNT_EQUITY);
   double riskMoney    = equity * (InpRiskPercent / 100.0);

   double tickValue    = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize     = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tickValue <= 0.0 || tickSize <= 0.0 || stopDistancePrice <= 0.0)
      return(0.0);

   // Loss per 1.0 lot if the stop is hit.
   double lossPerLot   = (stopDistancePrice / tickSize) * tickValue;
   if(lossPerLot <= 0.0)
      return(0.0);

   double lots = riskMoney / lossPerLot;
   return(NormalizeLot(lots));
  }

//+------------------------------------------------------------------+
//| Clamp lot to broker min/max/step                                 |
//+------------------------------------------------------------------+
double NormalizeLot(double lots)
  {
   double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   if(lotStep <= 0.0) lotStep = 0.01;

   lots = MathFloor(lots / lotStep) * lotStep;
   if(lots < minLot) lots = minLot;
   if(lots > maxLot) lots = maxLot;

   // Round to the step's decimal precision.
   int digits = (int)MathRound(MathLog10(1.0 / lotStep));
   if(digits < 0) digits = 0;
   return(NormalizeDouble(lots, digits));
  }

//+------------------------------------------------------------------+
//| Manage open positions: break-even and ATR trailing               |
//+------------------------------------------------------------------+
void ManageOpenPositions()
  {
   if(!InpUseBreakEven && !InpUseTrailing)
      return;

   double atr = GetAtr();
   if(atr <= 0.0)
      return;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(!position.SelectByTicket(ticket))
         continue;
      if(position.Symbol() != _Symbol || position.Magic() != InpMagicNumber)
         continue;

      ENUM_POSITION_TYPE ptype = position.PositionType();
      double openPrice = position.PriceOpen();
      double curSl     = position.StopLoss();
      double curTp     = position.TakeProfit();

      symInfo.RefreshRates();
      double price = (ptype == POSITION_TYPE_BUY) ? symInfo.Bid() : symInfo.Ask();

      double newSl = curSl;

      // --- Break-even ---
      if(InpUseBreakEven)
        {
         double trigger = atr * InpBreakEvenAtrMult;
         double lock    = atr * InpBreakEvenLockAtr;
         if(ptype == POSITION_TYPE_BUY && (price - openPrice) >= trigger)
           {
            double be = openPrice + lock;
            if(be > newSl) newSl = be;
           }
         else if(ptype == POSITION_TYPE_SELL && (openPrice - price) >= trigger)
           {
            double be = openPrice - lock;
            if(newSl == 0.0 || be < newSl) newSl = be;
           }
        }

      // --- ATR trailing ---
      if(InpUseTrailing)
        {
         double trailDist = atr * InpTrailAtrMult;
         if(ptype == POSITION_TYPE_BUY)
           {
            double candidate = price - trailDist;
            if(candidate > newSl && candidate > openPrice) newSl = candidate;
           }
         else
           {
            double candidate = price + trailDist;
            if((newSl == 0.0 || candidate < newSl) && candidate < openPrice) newSl = candidate;
           }
        }

      newSl = NormalizeDouble(newSl, _Digits);

      // Only modify when the stop actually moves in our favour.
      bool improves = (ptype == POSITION_TYPE_BUY)  ? (newSl > curSl + _Point) :
                      (ptype == POSITION_TYPE_SELL) ? (curSl == 0.0 || newSl < curSl - _Point) : false;

      if(improves && ModifyStopAllowed(ptype, price, newSl))
        {
         if(!trade.PositionModify(ticket, newSl, curTp))
            PrintFormat("PositionModify failed (ticket %I64u): %d", ticket, trade.ResultRetcode());
        }
     }
  }

//+------------------------------------------------------------------+
//| Ensure a proposed stop respects broker min distance              |
//+------------------------------------------------------------------+
bool ModifyStopAllowed(const ENUM_POSITION_TYPE ptype, const double price, const double newSl)
  {
   long stopLevelPts = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL);
   double minDist = stopLevelPts * _Point;
   if(minDist <= 0.0)
      return(true);

   if(ptype == POSITION_TYPE_BUY)
      return((price - newSl) >= minDist);
   return((newSl - price) >= minDist);
  }

//+------------------------------------------------------------------+
//| Validate SL/TP against broker minimum stop distance at entry     |
//+------------------------------------------------------------------+
bool StopsRespectMinDistance(const ENUM_ORDER_TYPE type, const double price,
                             const double sl, const double tp)
  {
   long stopLevelPts = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL);
   double minDist = stopLevelPts * _Point;
   if(minDist <= 0.0)
      return(true);

   if(type == ORDER_TYPE_BUY)
     {
      if((price - sl) < minDist) return(false);
      if(tp > 0.0 && (tp - price) < minDist) return(false);
     }
   else
     {
      if((sl - price) < minDist) return(false);
      if(tp > 0.0 && (price - tp) < minDist) return(false);
     }
   return(true);
  }

//+------------------------------------------------------------------+
//| Current ATR value (price units)                                  |
//+------------------------------------------------------------------+
double GetAtr()
  {
   double atr[1];
   if(CopyBuffer(hAtr, 0, 1, 1, atr) < 1)
      return(0.0);
   return(atr[0]);
  }

//+------------------------------------------------------------------+
//| Count EA-owned positions on this symbol                          |
//+------------------------------------------------------------------+
int CountEaPositions()
  {
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(!position.SelectByTicket(ticket))
         continue;
      if(position.Symbol() == _Symbol && position.Magic() == InpMagicNumber)
         count++;
     }
   return(count);
  }

//+------------------------------------------------------------------+
//| Spread filter                                                    |
//+------------------------------------------------------------------+
bool SpreadOk()
  {
   if(InpMaxSpreadPoints <= 0.0)
      return(true);
   double spreadPts = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   return(spreadPts <= InpMaxSpreadPoints);
  }

//+------------------------------------------------------------------+
//| Trading-session filter (server time)                             |
//+------------------------------------------------------------------+
bool WithinSession()
  {
   MqlDateTime now;
   TimeToStruct(TimeCurrent(), now);
   int h = now.hour;

   if(InpSessionStartHour == InpSessionEndHour)
      return(true); // 24h

   if(InpSessionStartHour < InpSessionEndHour)
      return(h >= InpSessionStartHour && h < InpSessionEndHour);

   // Overnight session wrapping past midnight.
   return(h >= InpSessionStartHour || h < InpSessionEndHour);
  }

//+------------------------------------------------------------------+
//| Midnight (00:00) of a given time, server tz                      |
//+------------------------------------------------------------------+
datetime DayStart(const datetime t)
  {
   return(t - (t % 86400));
  }

//+------------------------------------------------------------------+
//| Roll daily counters when the server date changes                 |
//+------------------------------------------------------------------+
void UpdateDailyState()
  {
   datetime today = DayStart(TimeCurrent());
   if(today != currentDay)
     {
      currentDay     = today;
      dayStartEquity = AccountInfoDouble(ACCOUNT_EQUITY);
      tradesToday    = 0;
      dailyLossHit   = false;
      // Drawdown halt is intentionally sticky across days until the EA is
      // restarted: a deep equity loss deserves manual review.
     }
  }

//+------------------------------------------------------------------+
//| Track the running equity peak for drawdown measurement           |
//+------------------------------------------------------------------+
void UpdateEquityPeak()
  {
   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   if(eq > equityPeak)
      equityPeak = eq;
  }

//+------------------------------------------------------------------+
//| Detect EA position closes to drive the re-entry cooldown         |
//+------------------------------------------------------------------+
void TrackPositionCloses()
  {
   int now = CountEaPositions();
   if(now < prevEaPositions)
      lastCloseBar = iTime(_Symbol, _Period, 0);
   prevEaPositions = now;
  }

//+------------------------------------------------------------------+
//| Daily loss limit: blocks new entries once breached               |
//+------------------------------------------------------------------+
bool CheckDailyLossLimit()
  {
   if(dailyLossHit)
      return(true);
   if(dayStartEquity <= 0.0)
      return(false);

   double eq    = AccountInfoDouble(ACCOUNT_EQUITY);
   double lossP = (dayStartEquity - eq) / dayStartEquity * 100.0;
   if(lossP >= InpDailyLossPercent)
     {
      dailyLossHit = true;
      PrintFormat("Daily loss limit hit (%.2f%% >= %.2f%%). No new trades today.",
                  lossP, InpDailyLossPercent);
      return(true);
     }
   return(false);
  }

//+------------------------------------------------------------------+
//| Max drawdown halt: stops the EA (and optionally flattens)        |
//+------------------------------------------------------------------+
bool CheckMaxDrawdown()
  {
   if(ddHalted)
      return(true);
   if(equityPeak <= 0.0)
      return(false);

   double eq = AccountInfoDouble(ACCOUNT_EQUITY);
   double dd = (equityPeak - eq) / equityPeak * 100.0;
   if(dd >= InpMaxDrawdownPercent)
     {
      ddHalted = true;
      PrintFormat("MAX DRAWDOWN HALT: %.2f%% >= %.2f%%. EA stopped for the session.",
                  dd, InpMaxDrawdownPercent);
      if(InpCloseOnDrawdown)
         CloseAllEaPositions("Max drawdown halt");
      return(true);
     }
   return(false);
  }

//+------------------------------------------------------------------+
//| Is it Friday at/after the configured flatten hour?               |
//+------------------------------------------------------------------+
bool IsWeekendFlattenTime()
  {
   MqlDateTime now;
   TimeToStruct(TimeCurrent(), now);
   return(now.day_of_week == 5 && now.hour >= InpFridayCloseHour);
  }

//+------------------------------------------------------------------+
//| Skip the first hour after the weekend gap (Sunday/Monday open)   |
//+------------------------------------------------------------------+
bool IsMondayOpenWindow()
  {
   MqlDateTime now;
   TimeToStruct(TimeCurrent(), now);
   // Many gold feeds open Sunday evening (server day_of_week 0) or Monday.
   bool weekOpenDay = (now.day_of_week == 1 || now.day_of_week == 0);
   return(weekOpenDay && now.hour == InpMondayOpenHour);
  }

//+------------------------------------------------------------------+
//| Close every EA-owned position on this symbol                     |
//+------------------------------------------------------------------+
void CloseAllEaPositions(const string reason)
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(!position.SelectByTicket(ticket))
         continue;
      if(position.Symbol() != _Symbol || position.Magic() != InpMagicNumber)
         continue;
      if(!trade.PositionClose(ticket))
         PrintFormat("Close failed (ticket %I64u): %d - %s",
                     ticket, trade.ResultRetcode(), reason);
      else
         PrintFormat("Closed ticket %I64u (%s)", ticket, reason);
     }
  }
//+------------------------------------------------------------------+
