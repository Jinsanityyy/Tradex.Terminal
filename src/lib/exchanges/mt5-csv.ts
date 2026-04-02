/**
 * MT5 Trade History Parser
 * Supports both MT5 HTML export and CSV/text report formats.
 *
 * How to export from MT5:
 *   View → Terminal → Account History tab
 *   Right-click → Save as Report (HTML) OR Save as Report (CSV)
 */
import type { NormalizedTrade } from "./types";

// ── MT5 HTML parser ───────────────────────────────────────────────────────────

function parseDate(raw: string): Date | null {
  // MT5 date format: "2024.01.15 10:30:00" or "2024-01-15 10:30:00"
  const cleaned = raw.trim().replace(/\./g, "-");
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

function cleanNumber(raw: string): number {
  // Remove spaces, non-breaking spaces, and parse
  return parseFloat(raw.replace(/\s/g, "").replace(",", ".")) || 0;
}

/**
 * Parse MT5 "Save as Report (HTML)" export.
 * The HTML contains a <table> with deal rows.
 * We look for "out" direction rows (closing trades) with non-zero profit.
 */
export function parseMT5HTML(html: string): NormalizedTrade[] {
  const trades: NormalizedTrade[] = [];

  // Extract all <tr> rows from the HTML
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      // Strip inner HTML tags, decode entities
      const text = cellMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .trim();
      cells.push(text);
    }

    // MT5 HTML report has these columns (order may vary slightly by version):
    // Time | Deal | Symbol | Type | Direction | Volume | Price | Order | Commission | Swap | Profit | Balance | Comment
    if (cells.length < 11) continue;

    const [time, deal, symbol, type, direction, , , , commission, swap, profit] = cells;

    // Only process closing deals
    const dir = direction?.toLowerCase() ?? "";
    const t = type?.toLowerCase() ?? "";
    if (!dir.includes("out") && !t.includes("close") && dir !== "inout") continue;

    const profitVal = cleanNumber(profit);
    const commVal = cleanNumber(commission);
    const swapVal = cleanNumber(swap);

    // Skip balance/deposit/withdrawal entries
    if (!symbol || symbol === "" || t === "balance" || t === "deposit" || t === "withdrawal") continue;

    const closedAt = parseDate(time);
    if (!closedAt) continue;

    trades.push({
      tradeId: deal || `mt5-${time}-${symbol}`,
      symbol: symbol.toUpperCase(),
      side: profitVal >= 0 ? "long" : "short",
      pnl: profitVal + swapVal,
      fee: Math.abs(commVal),
      closedAt,
    });
  }

  return trades;
}

/**
 * Parse MT5 CSV export (comma or tab separated).
 * Column order: Time,Deal,Symbol,Type,Direction,Volume,Price,Order,Commission,Swap,Profit,Balance,Comment
 */
export function parseMT5CSV(csv: string): NormalizedTrade[] {
  const trades: NormalizedTrade[] = [];
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return trades;

  // Detect separator
  const sep = lines[0].includes("\t") ? "\t" : ",";

  // Find header row to determine column indices
  const header = lines[0].split(sep).map(h => h.toLowerCase().trim().replace(/"/g, ""));
  const idx = {
    time:        header.findIndex(h => h.includes("time")),
    deal:        header.findIndex(h => h.includes("deal") || h.includes("ticket")),
    symbol:      header.findIndex(h => h.includes("symbol")),
    type:        header.findIndex(h => h === "type"),
    direction:   header.findIndex(h => h.includes("direction") || h.includes("entry")),
    commission:  header.findIndex(h => h.includes("commission")),
    swap:        header.findIndex(h => h.includes("swap")),
    profit:      header.findIndex(h => h.includes("profit")),
  };

  // Fallback to positional if header not found
  const t = (row: string[], i: number, fallback: number) =>
    (i >= 0 ? row[i] : row[fallback] ?? "").replace(/"/g, "").trim();

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(sep);
    if (row.length < 9) continue;

    const direction = t(row, idx.direction, 4).toLowerCase();
    const type      = t(row, idx.type, 3).toLowerCase();

    if (!direction.includes("out") && !type.includes("close") && direction !== "inout") continue;

    const symbol    = t(row, idx.symbol, 2).toUpperCase();
    const time      = t(row, idx.time, 0);
    const deal      = t(row, idx.deal, 1);
    const profit    = cleanNumber(t(row, idx.profit, 10));
    const commission = cleanNumber(t(row, idx.commission, 8));
    const swap      = cleanNumber(t(row, idx.swap, 9));

    if (!symbol || type === "balance" || type === "deposit" || type === "withdrawal") continue;

    const closedAt = parseDate(time);
    if (!closedAt) continue;

    trades.push({
      tradeId: deal || `mt5-${time}-${symbol}`,
      symbol,
      side: profit >= 0 ? "long" : "short",
      pnl: profit + swap,
      fee: Math.abs(commission),
      closedAt,
    });
  }

  return trades;
}

export function parseMT5File(content: string): NormalizedTrade[] {
  const trimmed = content.trim();
  // Detect HTML vs CSV
  if (trimmed.startsWith("<") || trimmed.toLowerCase().includes("<html")) {
    return parseMT5HTML(trimmed);
  }
  return parseMT5CSV(trimmed);
}
