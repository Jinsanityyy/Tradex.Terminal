// Shared between /api/gumroad/verify-key (sets it, pre-Google-redirect) and
// /auth/callback (reads + clears it, post-Google-redirect). Kept out of the
// route files themselves so neither has to import from the other's route.ts.
export const PENDING_LICENSE_COOKIE = "tradex_pending_gumroad_key";
