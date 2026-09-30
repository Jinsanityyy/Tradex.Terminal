import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { supertrend } from "../indicators";
import type { Candle } from "../types";

/**
 * Golden file: OHLC exported from TradingView plus TradingView's own SuperTrend.
 * See fixtures/README.md. Skipped while the fixture has no data rows.
 */
const dir = join(__dirname, "fixtures");
const lines = readFileSync(join(dir, "golden.csv"), "utf8")
  .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
const header = lines[0]?.split(",").map((h) => h.trim().toLowerCase()) ?? [];
const rows = lines.slice(1).map((l) => l.split(",").map((v) => v.trim()));

test("golden: SuperTrend matches TradingView within 0.01", { skip: rows.length === 0 && "fixtures/golden.csv is empty" }, () => {
  const col = (name: string) => header.indexOf(name);
  for (const need of ["time", "open", "high", "low", "close", "supertrend"]) {
    assert.ok(col(need) >= 0, `golden.csv is missing column "${need}"`);
  }
  const num = (r: string[], name: string) => (r[col(name)] === "" || r[col(name)] === undefined ? NaN : Number(r[col(name)]));
  const factor = Number(process.env.GOLDEN_FACTOR ?? 4);
  const atrLen = Number(process.env.GOLDEN_ATR_LEN ?? 10);
  const candles: Candle[] = rows.map((r) => ({
    time: num(r, "time"), open: num(r, "open"), high: num(r, "high"), low: num(r, "low"),
    close: num(r, "close"), volume: col("volume") >= 0 ? num(r, "volume") || 0 : 0,
  }));
  const { line } = supertrend(candles, factor, atrLen);
  let compared = 0;
  rows.forEach((r, i) => {
    const tv = num(r, "supertrend");
    if (Number.isNaN(tv) || Number.isNaN(line[i])) return;
    compared++;
    assert.ok(Math.abs(line[i] - tv) <= 0.01, `row ${i + 2} (time ${candles[i].time}): ours ${line[i].toFixed(4)} vs TradingView ${tv}`);
  });
  assert.ok(compared > 0, "no comparable rows");
});
