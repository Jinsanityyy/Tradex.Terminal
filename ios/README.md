# iOS platform

Scaffolded with `npx cap add ios`. Same codebase as Android — the UI is the
Next.js app served from `server.url` in `capacitor.config.ts`, not bundled here.

## What works today

`.github/workflows/ios-simulator.yml` builds for the Simulator, boots an iPhone,
installs the app and uploads screenshots. Simulator builds need no code signing,
so this runs with no Apple Developer account. Trigger it from the Actions tab.

macOS runners bill at 10x Linux, so the workflow is manual-dispatch only.

## What the Simulator cannot test

- **Push notifications** — APNs requires a physical device and a paid account.
- **In-app purchase** — StoreKit needs real products in App Store Connect.
- **Native Google Sign-In** — needs an iOS OAuth client (free, but needs the
  bundle id registered) and does not work in a Simulator without it.

The app will still load and render; anything touching those three paths will
fail or no-op.

## Before a store submission

1. **Apple Developer Program** — $99/year. Gates everything below.
2. **Sign in with Apple** — Guideline 4.8 requires it wherever a third-party
   social login is offered. Flip `apple: true` in the `SocialLogin` plugin
   config, add the Apple provider in Supabase, and create the Service ID + key.
3. **Guideline 4.2** — the app currently loads everything from `server.url`,
   which Apple reads as a repackaged website. Bundling the `/m` route into
   `webDir` and keeping only the API remote is the mitigation. `/m` is already
   `"use client"` and self-gates per tab (see `PRO_ONLY_WIDGETS` in
   `MobileHome.tsx`), so middleware is not in its path.
4. **APNs key** uploaded to Firebase, so the existing FCM stack reaches iOS.
5. **RevenueCat** — new App Store Connect app, products and entitlement mapping.

## Bundle identifier

iOS uses `online.tradexterminal.app`. Android is permanently
`online.tradexterminal.twa` (see the comment in `android/app/build.gradle`);
the `twa` suffix is an Android artifact and does not belong in an App Store id.
