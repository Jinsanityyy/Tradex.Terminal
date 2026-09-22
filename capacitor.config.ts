import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "online.tradexterminal.twa",
  appName: "TradeX",
  webDir: "out",
  server: {
    url: "https://tradexterminal.online/m",
    cleartext: false,
    // Google sign-in itself no longer navigates anywhere (see
    // src/lib/auth/native-google.ts), but Supabase and our own origin still
    // have to stay in the webview rather than being handed to the system
    // browser, which would land the session in a different cookie jar.
    allowNavigation: ["*.supabase.co", "tradexterminal.online"],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0a0e1a",
  },
  ios: {
    backgroundColor: "#0a0e1a",
    // The web app draws its own dark chrome; without this the WKWebView
    // overscroll bounce exposes a white gutter at the top and bottom.
    scrollEnabled: true,
    contentInset: "never",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0e1a",
      overlaysWebView: true,
    },
    // Google is the only provider we use. The others each drag in an SDK —
    // Facebook's in particular is a data-collection disclosure on Play we have
    // no reason to make — so they are compiled out of the Android build.
    // Google is the only provider we use on Android. On iOS, App Store Review
    // Guideline 4.8 requires Sign in with Apple alongside any third-party social
    // login, so apple has to be compiled in there before a store submission.
    // It is off until the Apple Service ID and key exist  -  see ios/README.md.
    SocialLogin: {
      providers: { google: true, facebook: false, apple: false, twitter: false },
    },
  },
};

export default config;
