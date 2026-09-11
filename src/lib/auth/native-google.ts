/**
 * Native Google Sign-In for the Android app.
 *
 * The browser flow (signInWithOAuth) redirects to accounts.google.com. Google
 * refuses OAuth served inside an embedded WebView, which is exactly what
 * Capacitor runs — so in the app that round trip dead-ends on a 400 and the
 * account chooser never appears. The supported path is to ask Android itself
 * for a Google id_token via Credential Manager and hand that to Supabase's
 * signInWithIdToken, which never leaves the app.
 *
 * Everything here is lazy: the plugin is only imported when we are actually
 * running natively, so the web bundle never pays for it.
 */

const WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

/** True inside the Capacitor Android shell (not a mobile browser, not a TWA). */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/**
 * Whether the native path is usable at all. Without a web client ID the plugin
 * has nothing to ask Google for, so callers fall back to the browser flow
 * rather than failing — that keeps a misconfigured build no worse than before.
 */
export function canUseNativeGoogle(): boolean {
  return isCapacitorNative() && WEB_CLIENT_ID.length > 0;
}

let initialized: Promise<typeof import("@capgo/capacitor-social-login")> | null = null;

function loadPlugin() {
  if (!initialized) {
    initialized = import("@capgo/capacitor-social-login").then(async (mod) => {
      // The server client ID, not an Android one: Credential Manager mints the
      // id_token with this as its audience, and that is the ID Supabase's
      // Google provider validates against.
      await mod.SocialLogin.initialize({ google: { webClientId: WEB_CLIENT_ID } });
      return mod;
    });
    // A failed initialize must not poison every later attempt.
    initialized.catch(() => { initialized = null; });
  }
  return initialized;
}

/**
 * Opens the Android account chooser and returns the Google id_token.
 *
 * `style: "standard"` is the full-screen chooser — the one that lists every
 * Google account on the phone. No `scopes` are requested on purpose: asking
 * for them switches the plugin to a flow that needs a modified MainActivity,
 * and the default OIDC claims (email, profile) are all Supabase needs.
 */
export async function getNativeGoogleIdToken(): Promise<string> {
  const { SocialLogin } = await loadPlugin();

  const res = await SocialLogin.login({
    provider: "google",
    options: { style: "standard", filterByAuthorizedAccounts: false },
  });

  const result = res.result as { idToken?: string | null };
  const idToken = result?.idToken;
  if (!idToken) throw new Error("Google did not return an identity token.");
  return idToken;
}
