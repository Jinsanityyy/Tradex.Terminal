//+------------------------------------------------------------------+
//| TradexJournal.mq5                                                |
//| Journals every closed MT5 trade to TradeX in real time.          |
//|                                                                  |
//| Setup:                                                           |
//|  1. Tools > Options > Expert Advisors: tick "Allow WebRequest    |
//|     for listed URL" and add https://tradexterminal.online        |
//|  2. Copy this file to MQL5/Experts, compile it in MetaEditor.    |
//|  3. Drag it onto ANY one chart, paste your TradeX token, and     |
//|     enable Algo Trading. One copy covers the whole account:      |
//|     manual trades and other EAs' trades are journaled too.       |
//|                                                                  |
//| This EA never places, modifies or closes orders. It only reads   |
//| your deal history and sends closed trades to TradeX.             |
//+------------------------------------------------------------------+
#property copyright   "TradeX"
#property link        "https://tradexterminal.online"
#property version     "1.03"
#property description "Sends every closed trade to your TradeX P&L calendar as it happens."

input string InpToken        = "";                                               // TradeX token (tdx_mt5_...)
input string InpWebhookUrl   = "https://tradexterminal.online/api/mt5/webhook";  // TradeX webhook URL
input int    InpBackfillDays = 30;                                               // Resend closed trades from the last N days on start
input int    InpRetrySeconds = 15;                                               // Retry interval while TradeX is unreachable

#define BATCH_SIZE   100
#define HTTP_TIMEOUT 10000
#define HEARTBEAT_SECONDS 300

string   g_queue[];        // deal JSON objects waiting to be sent
ulong    g_queued[];       // their tickets, to avoid queueing a deal twice
ulong    g_unresolved[];   // deal tickets not yet visible in history
string   g_token    = "";   // InpToken without stray whitespace from pasting
bool     g_connected = false;
string   g_status   = "starting";
datetime g_lastSent = 0;
string   g_lastError = "";

// How the position being closed was opened (see ReadEntry).
struct EntryInfo
  {
   datetime time;        // first entry
   double   price;       // volume-weighted entry price
   double   volume;
   double   commission;
   double   sl;          // stop placed with the first entry order
   double   tp;
  };

//+------------------------------------------------------------------+
int OnInit()
  {
   g_token = InpToken;
   StringTrimLeft(g_token);
   StringTrimRight(g_token);
   if(StringFind(g_token, "tdx_mt5_") != 0)
     {
      Alert("TradeX Journal: paste the token from TradeX > P&L Calendar > Connect > MT5 into the EA inputs.");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(MQLInfoInteger(MQL_TESTER))
     {
      Print("TradeX Journal: WebRequest is unavailable in the Strategy Tester, nothing will be sent.");
      return INIT_SUCCEEDED;
     }

   EventSetTimer(MathMax(InpRetrySeconds, 5));

   Ping();

   Backfill();
   Flush();
   ShowStatus();
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   Comment("");
  }

//+------------------------------------------------------------------+
void OnTimer()
  {
   // Deals that were not in history yet when their transaction arrived.
   for(int i = ArraySize(g_unresolved) - 1; i >= 0; i--)
      if(QueueDeal(g_unresolved[i], true))
         RemoveAt(g_unresolved, i);

   // Keep trying until TradeX has heard from us once, so fixing the
   // WebRequest allow-list or the network takes effect without a restart.
   if(!g_connected && ArraySize(g_queue) == 0)
      Ping();
   // Heartbeat, so TradeX can show the EA as live between trades.
   else if(ArraySize(g_queue) == 0 && TimeLocal() - g_lastSent >= HEARTBEAT_SECONDS)
      Ping();

   Flush();
   ShowStatus();
  }

//+------------------------------------------------------------------+
void Ping()
  {
   Post("{\"type\":\"ping\"," + AccountJson() + "}");
  }

//+------------------------------------------------------------------+
//| Fires for every trade on the account, whoever placed it.         |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
  {
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD || trans.deal == 0)
      return;

   if(!QueueDeal(trans.deal, false))
     {
      int n = ArraySize(g_unresolved);
      ArrayResize(g_unresolved, n + 1);
      g_unresolved[n] = trans.deal;
     }
   Flush();
   ShowStatus();
  }

//+------------------------------------------------------------------+
//| Queue every closing deal of the last InpBackfillDays days.       |
//| The server dedupes by ticket, so resending is harmless.          |
//+------------------------------------------------------------------+
void Backfill()
  {
   if(InpBackfillDays <= 0)
      return;
   datetime from = TimeCurrent() - (datetime)InpBackfillDays * 86400;
   if(!HistorySelect(from, TimeCurrent() + 86400))
      return;

   // Collect tickets first: QueueDeal reselects history per position.
   ulong tickets[];
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong t = HistoryDealGetTicket(i);
      if(t > 0 && IsClosingDeal(t))
        {
         int n = ArraySize(tickets);
         ArrayResize(tickets, n + 1);
         tickets[n] = t;
        }
     }
   for(int i = 0; i < ArraySize(tickets); i++)
      QueueDeal(tickets[i], true);

   PrintFormat("TradeX Journal: backfilling %d closed trade(s) from the last %d day(s).", ArraySize(tickets), InpBackfillDays);
  }

//+------------------------------------------------------------------+
//| A deal that closes (part of) a position: out, reverse, close-by. |
//| The deal must be in the current history selection.               |
//+------------------------------------------------------------------+
bool IsClosingDeal(ulong ticket)
  {
   long type  = HistoryDealGetInteger(ticket, DEAL_TYPE);
   long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
   if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL)
      return false;   // balance, credit, bonus...
   return entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_INOUT || entry == DEAL_ENTRY_OUT_BY;
  }

//+------------------------------------------------------------------+
//| Returns true when the deal is handled (queued or not a close),   |
//| false when it is not in history yet and should be retried.       |
//+------------------------------------------------------------------+
bool QueueDeal(ulong ticket, bool fromHistory)
  {
   for(int i = 0; i < ArraySize(g_queued); i++)
      if(g_queued[i] == ticket)
         return true;

   if(!HistoryDealSelect(ticket))
      return false;
   if(!IsClosingDeal(ticket))
      return true;

   string symbol     = HistoryDealGetString(ticket, DEAL_SYMBOL);
   long   type       = HistoryDealGetInteger(ticket, DEAL_TYPE);
   long   positionId = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
   double volume     = HistoryDealGetDouble(ticket, DEAL_VOLUME);
   double profit     = HistoryDealGetDouble(ticket, DEAL_PROFIT);
   double swap       = HistoryDealGetDouble(ticket, DEAL_SWAP);
   double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   double fee        = HistoryDealGetDouble(ticket, DEAL_FEE);
   datetime time     = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
   double closePrice = HistoryDealGetDouble(ticket, DEAL_PRICE);
   double closeSl    = HistoryDealGetDouble(ticket, DEAL_SL);
   double closeTp    = HistoryDealGetDouble(ticket, DEAL_TP);

   // A sell deal closes a long position, a buy deal closes a short one.
   bool   isLong = (type == DEAL_TYPE_SELL);
   string side   = isLong ? "long" : "short";

   // Everything about how the position was opened. Reselects history, so it
   // comes after every read of the closing deal above.
   EntryInfo entry;
   ReadEntry(positionId, entry);

   // Brokers often charge part of the commission on entry. Attribute it to
   // this close in proportion to the volume closed, so partial closes add up.
   if(entry.volume > 0)
      commission += entry.commission * MathMin(volume / entry.volume, 1.0);

   // Initial stop: as placed with the entry order; failing that, where it sat at the close.
   double sl = entry.sl > 0 ? entry.sl : closeSl;
   double tp = entry.tp > 0 ? entry.tp : closeTp;
   double risk = RiskAtStop(symbol, isLong, volume, entry.price, sl);

   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   if(digits <= 0) digits = 5;
   long offset = ServerUtcOffset();

   string json = StringFormat(
      "{\"ticket\":\"%I64u\",\"symbol\":\"%s\",\"side\":\"%s\",\"profit\":%s,\"swap\":%s,\"commission\":%s,\"fee\":%s,\"close_time\":%I64d",
      ticket, Escape(symbol), side,
      DoubleToString(profit, 2), DoubleToString(swap, 2),
      DoubleToString(commission, 2), DoubleToString(fee, 2),
      (long)time - offset);
   json += ",\"volume\":" + DoubleToString(volume, 2);
   json += ",\"close_price\":" + DoubleToString(closePrice, digits);
   if(entry.time > 0)  json += ",\"open_time\":" + IntegerToString((long)entry.time - offset);
   if(entry.price > 0) json += ",\"open_price\":" + DoubleToString(entry.price, digits);
   if(sl > 0)          json += ",\"sl\":" + DoubleToString(sl, digits);
   if(tp > 0)          json += ",\"tp\":" + DoubleToString(tp, digits);
   if(risk > 0)        json += ",\"risk\":" + DoubleToString(risk, 2);
   json += "}";

   int n = ArraySize(g_queue);
   ArrayResize(g_queue, n + 1);
   ArrayResize(g_queued, n + 1);
   g_queue[n]  = json;
   g_queued[n] = ticket;

   if(!fromHistory)
      PrintFormat("TradeX Journal: closed %s %s %.2f lots, P/L %.2f. Sending...", side, symbol, volume, profit + swap);
   return true;
  }

//+------------------------------------------------------------------+
void ReadEntry(long positionId, EntryInfo &e)
  {
   e.time = 0; e.price = 0; e.volume = 0; e.commission = 0; e.sl = 0; e.tp = 0;
   if(positionId <= 0 || !HistorySelectByPosition(positionId))
      return;
   double notional = 0;
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong t = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(t, DEAL_ENTRY) != DEAL_ENTRY_IN)
         continue;
      double v = HistoryDealGetDouble(t, DEAL_VOLUME);
      datetime tm = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
      if(e.time == 0 || tm < e.time)
        {
         e.time = tm;
         e.sl = HistoryDealGetDouble(t, DEAL_SL);
         e.tp = HistoryDealGetDouble(t, DEAL_TP);
        }
      notional     += HistoryDealGetDouble(t, DEAL_PRICE) * v;
      e.volume     += v;
      e.commission += HistoryDealGetDouble(t, DEAL_COMMISSION);
     }
   if(e.volume > 0)
      e.price = notional / e.volume;
  }

//+------------------------------------------------------------------+
//| Money lost had the stop been hit, for the volume closed. 0 when   |
//| there is no stop, or it sits on the profit side (break-even+).    |
//+------------------------------------------------------------------+
double RiskAtStop(string symbol, bool isLong, double volume, double entryPrice, double sl)
  {
   if(sl <= 0 || entryPrice <= 0 || volume <= 0)
      return 0;
   if(isLong ? sl >= entryPrice : sl <= entryPrice)
      return 0;
   double pl = 0;
   if(!OrderCalcProfit(isLong ? ORDER_TYPE_BUY : ORDER_TYPE_SELL, symbol, volume, entryPrice, sl, pl))
      return 0;
   return MathAbs(pl);
  }

//+------------------------------------------------------------------+
//| Deal times are broker server time; TradeX wants UTC.             |
//+------------------------------------------------------------------+
long ServerUtcOffset()
  {
   long diff = (long)(TimeTradeServer() - TimeGMT());
   return (long)MathRound(diff / 900.0) * 900;   // offsets come in 15-minute steps
  }

//+------------------------------------------------------------------+
void Flush()
  {
   while(ArraySize(g_queue) > 0)
     {
      int count = MathMin(ArraySize(g_queue), BATCH_SIZE);
      string deals = "";
      for(int i = 0; i < count; i++)
         deals += (i > 0 ? "," : "") + g_queue[i];

      if(!Post("{\"type\":\"deals\"," + AccountJson() + ",\"deals\":[" + deals + "]}"))
         return;   // keep the queue; OnTimer retries

      ArrayRemove(g_queue, 0, count);
      ArrayRemove(g_queued, 0, count);
     }
  }

//+------------------------------------------------------------------+
bool Post(string body)
  {
   char data[], result[];
   string resultHeaders;
   int len = StringToCharArray(body, data, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(data, len - 1);   // drop the trailing NUL

   string headers = "Content-Type: application/json\r\nAuthorization: Bearer " + g_token + "\r\n";
   ResetLastError();
   int code = WebRequest("POST", InpWebhookUrl, headers, HTTP_TIMEOUT, data, result, resultHeaders);

   if(code == -1)
     {
      int err = GetLastError();
      if(err == 4014)
         SetError("add " + InpWebhookUrl + " to Tools > Options > Expert Advisors > Allow WebRequest");
      else
         SetError("network error " + IntegerToString(err) + ", retrying");
      return false;
     }
   if(code == 401)
     {
      SetError("token rejected. Generate a new one in TradeX and update the EA inputs");
      return false;
     }
   if(code < 200 || code >= 300)
     {
      SetError("TradeX answered HTTP " + IntegerToString(code) + ": " + CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8));
      return false;
     }

   if(g_lastError != "")
      Print("TradeX Journal: reconnected.");
   g_lastError = "";
   g_connected = true;
   g_status    = "connected";
   g_lastSent  = TimeLocal();
   return true;
  }

//+------------------------------------------------------------------+
void SetError(string message)
  {
   g_status = "error: " + message;
   if(message != g_lastError)   // don't flood the journal on every retry
      Print("TradeX Journal: ", message);
   g_lastError = message;
  }

//+------------------------------------------------------------------+
void ShowStatus()
  {
   string last = g_lastSent > 0 ? TimeToString(g_lastSent, TIME_MINUTES | TIME_SECONDS) : "never";
   Comment("TradeX Journal: ", g_status,
           "\nLast contact: ", last,
           "\nWaiting to send: ", ArraySize(g_queue) + ArraySize(g_unresolved));
  }

//+------------------------------------------------------------------+
string AccountJson()
  {
   return StringFormat("\"account\":{\"login\":\"%I64d\",\"server\":\"%s\",\"currency\":\"%s\"}",
                       AccountInfoInteger(ACCOUNT_LOGIN),
                       Escape(AccountInfoString(ACCOUNT_SERVER)),
                       Escape(AccountInfoString(ACCOUNT_CURRENCY)));
  }

//+------------------------------------------------------------------+
string Escape(string s)
  {
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   return s;
  }

//+------------------------------------------------------------------+
void RemoveAt(ulong &arr[], int index)
  {
   ArrayRemove(arr, index, 1);
  }
//+------------------------------------------------------------------+
