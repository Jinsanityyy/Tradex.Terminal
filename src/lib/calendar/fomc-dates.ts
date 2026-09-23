/**
 * FOMC rate-decision days (the statement day, 2:00 pm ET), from the Fed's
 * published calendars. Most meetings leave the rate unchanged, so they can't be
 * found by looking for changes in the rate series: every one is listed here.
 * Add each new year's dates when the Fed publishes them (usually in the summer).
 */
export const FOMC_DECISION_DATES: readonly string[] = [
  // 2023
  "2023-02-01", "2023-03-22", "2023-05-03", "2023-06-14", "2023-07-26", "2023-09-20", "2023-11-01", "2023-12-13",
  // 2024
  "2024-01-31", "2024-03-20", "2024-05-01", "2024-06-12", "2024-07-31", "2024-09-18", "2024-11-07", "2024-12-18",
  // 2025
  "2025-01-29", "2025-03-19", "2025-05-07", "2025-06-18", "2025-07-30", "2025-09-17", "2025-10-29", "2025-12-10",
  // 2026
  "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17", "2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09",
];
