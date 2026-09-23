/**
 * Which calendar day a trade belongs to.
 *
 * Synced trades carry a UTC timestamp, but a trader in Manila who closes at
 * 07:00 on the 24th thinks of that as the 24th, not 23:00 UTC on the 23rd.
 * Every P&L view therefore buckets by the viewer's IANA timezone, which the
 * browser sends as `?tz=`. Manual trades already store the trader's own date.
 *
 * Pure functions only, so the same code runs on the server and in the browser.
 */

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The `tz` query param if it is a real IANA zone, else UTC (the old behaviour). */
export function resolveTimeZone(tz: string | null | undefined): string {
  return tz && tz.length <= 64 && isValidTimeZone(tz) ? tz : "UTC";
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const timeFormatters = new Map<string, Intl.DateTimeFormat>();

function formatter(cache: Map<string, Intl.DateTimeFormat>, tz: string, opts: Intl.DateTimeFormatOptions) {
  let f = cache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, ...opts });
    cache.set(tz, f);
  }
  return f;
}

/** YYYY-MM-DD of `at` as seen in `tz`. */
export function localDate(at: string | number | Date, tz: string): string {
  const parts = formatter(dateFormatters, tz, { year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(at));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** HH:MM (24h) of `at` as seen in `tz`. */
export function localTime(at: string | number | Date, tz: string): string {
  const parts = formatter(timeFormatters, tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(at));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

/** Adds `days` to a YYYY-MM-DD string. */
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The browser's timezone; UTC when it can't be read. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Today in the browser's timezone, as YYYY-MM-DD. */
export function todayLocal(): string {
  return localDate(Date.now(), browserTimeZone());
}

/** Appends the browser's timezone to a P&L API path. */
export function withTz(path: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}tz=${encodeURIComponent(browserTimeZone())}`;
}
