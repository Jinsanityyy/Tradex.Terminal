/**
 * Forwards the caller's credentials across an internal API-to-API hop.
 *
 * Now that data routes are entitlement-gated, a server-side
 * `fetch(`${origin}/api/...`)` arrives with no cookies and gets a 401 — even
 * when the original request came from a paying user. Anything doing an
 * internal hop must pass the caller's auth through.
 */
export function forwardAuth(req: Request): HeadersInit {
  const headers: Record<string, string> = {};

  const cookie = req.headers.get("cookie");
  if (cookie) headers.cookie = cookie;

  const auth = req.headers.get("authorization");
  if (auth) headers.authorization = auth;

  return headers;
}
