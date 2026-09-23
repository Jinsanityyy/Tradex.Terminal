/**
 * Risk Guard: where the trader stands against their own limits and, in prop
 * mode, against the challenge rules. Pure, so it is shared and testable.
 */

export interface TradingRules {
  account_size: number | null;
  daily_loss_limit: number | null;
  max_trades_per_day: number | null;
  max_consecutive_losses: number | null;
  prop_enabled: boolean;
  prop_start_date: string | null;   // YYYY-MM-DD
  profit_target: number | null;
  max_drawdown: number | null;
  drawdown_type: "static" | "trailing";
}

export const EMPTY_RULES: TradingRules = {
  account_size: null,
  daily_loss_limit: null,
  max_trades_per_day: null,
  max_consecutive_losses: null,
  prop_enabled: false,
  prop_start_date: null,
  profit_target: null,
  max_drawdown: null,
  drawdown_type: "static",
};

/** The minimum a trade needs for the guard: its day, its P&L, and an order within the day. */
export interface GuardTrade {
  date: string;              // YYYY-MM-DD, local
  pnl: number;
  closeTime: string | null;  // HH:MM, local
}

export type Level = "ok" | "warn" | "breach";

export interface Meter {
  /** How much of the limit is used, 0..∞ (1 = at the limit). */
  used: number;
  value: number;
  limit: number;
  level: Level;
}

export interface GuardStatus {
  level: Level;
  /** Human reasons, most severe first. */
  reasons: string[];
  today: {
    pnl: number;
    trades: number;
    lossStreak: number;
    loss: Meter | null;      // today's loss vs daily_loss_limit
    count: Meter | null;     // trades vs max_trades_per_day
    streak: Meter | null;    // losses in a row vs max_consecutive_losses
  };
  prop: null | {
    pnl: number;
    target: Meter | null;    // progress toward the target (level "ok" until met)
    drawdown: Meter | null;  // drawdown used vs max_drawdown
    passed: boolean;
  };
}

const WARN_AT = 0.8;

function meter(value: number, limit: number | null): Meter | null {
  if (!limit || limit <= 0) return null;
  const used = Math.max(0, value) / limit;
  return { used, value, limit, level: used >= 1 ? "breach" : used >= WARN_AT ? "warn" : "ok" };
}

const order = (a: GuardTrade, b: GuardTrade) =>
  `${a.date}T${a.closeTime ?? "00:00"}`.localeCompare(`${b.date}T${b.closeTime ?? "00:00"}`);

const worst = (levels: Level[]): Level =>
  levels.includes("breach") ? "breach" : levels.includes("warn") ? "warn" : "ok";

const money = (n: number) => `$${Math.abs(n).toFixed(2)}`;

export function computeGuard(rules: TradingRules, trades: GuardTrade[], today: string): GuardStatus {
  const todays = trades.filter((t) => t.date === today).sort(order);
  const todayPnl = todays.reduce((s, t) => s + t.pnl, 0);

  let lossStreak = 0;
  for (let i = todays.length - 1; i >= 0 && todays[i].pnl < 0; i--) lossStreak++;

  const loss = meter(-todayPnl, rules.daily_loss_limit);
  const count = meter(todays.length, rules.max_trades_per_day);
  const streak = meter(lossStreak, rules.max_consecutive_losses);

  const reasons: string[] = [];
  if (loss?.level === "breach") reasons.push(`Daily loss limit hit: down ${money(todayPnl)} of ${money(loss.limit)}.`);
  if (count?.level === "breach") reasons.push(`Max trades for today reached (${todays.length}/${count.limit}).`);
  if (streak?.level === "breach") reasons.push(`${lossStreak} losses in a row. Step away before revenge trading.`);

  let prop: GuardStatus["prop"] = null;
  if (rules.prop_enabled) {
    const since = rules.prop_start_date ?? "0000-00-00";
    const run = trades.filter((t) => t.date >= since).sort(order);
    let cum = 0, peak = 0;
    for (const t of run) { cum += t.pnl; if (cum > peak) peak = cum; }
    // Static: measured from the starting balance. Trailing: from the highest equity reached.
    const ddUsed = rules.drawdown_type === "trailing" ? peak - cum : Math.max(0, -cum);
    const drawdown = meter(ddUsed, rules.max_drawdown);
    const target = rules.profit_target && rules.profit_target > 0
      ? { used: Math.max(0, cum) / rules.profit_target, value: cum, limit: rules.profit_target, level: "ok" as Level }
      : null;
    const passed = !!target && cum >= target.limit && drawdown?.level !== "breach";
    if (drawdown?.level === "breach") reasons.unshift(`Max drawdown breached (${money(ddUsed)} of ${money(drawdown.limit)}).`);
    prop = { pnl: cum, target, drawdown, passed };
  }

  const levels = [loss, count, streak, prop?.drawdown].filter((m): m is Meter => !!m).map((m) => m.level);
  const level = worst(levels);
  if (level === "warn" && reasons.length === 0) reasons.push("Close to one of your limits. Trade smaller or stop for the day.");

  return { level, reasons, today: { pnl: todayPnl, trades: todays.length, lossStreak, loss, count, streak }, prop };
}
