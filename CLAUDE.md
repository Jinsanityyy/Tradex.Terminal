# TradeX Terminal — Claude Instructions

## Project Overview
TradeX Terminal is a trading signals and market intelligence platform.
- **Web app:** Next.js 14 (App Router) deployed on **Vercel**
- **Mobile:** Capacitor wrapping the web app → Android APK on **Google Play Store**
- **DB/Auth:** Supabase
- **Push:** FCM (Firebase Cloud Messaging) for Android + Web Push (VAPID)

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 App Router, TypeScript |
| Styling | Tailwind CSS |
| Auth/DB | Supabase (`@supabase/ssr`) |
| Mobile | Capacitor 8 (Android) |
| Push | FCM (`firebase-admin`) + Web Push (`web-push`) |
| Payments | RevenueCat + Stripe + PayPal |
| AI | Anthropic SDK |

---

## Git Rules
- **ALWAYS push directly to `main`** — no feature branches
- Never skip hooks or force push

---

## Android Build Process

### Key paths
- Android source: `android/app/src/main/`
- Java files: `android/app/src/main/java/com/tradex/terminal/`
- Icons: `android/app/src/main/res/mipmap-*/`
- Manifest: `android/app/src/main/AndroidManifest.xml`
- Build config: `android/app/build.gradle`

### Build commands (run from `android/` folder)
```powershell
# Build AAB (for Play Store)
.\gradlew.bat bundleRelease

# Build APK (for direct install)
.\gradlew.bat assembleRelease
```

### Sign AAB
```powershell
cd C:\Users\REVAMED-KIM\Project\tradex
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore "C:\Users\REVAMED-KIM\Desktop\TX\TX IMP\signing.keystore" "android\app\build\outputs\bundle\release\app-release.aab" tradex-key
# Password: aCnYwoiLILLO  (stored in C:\Users\REVAMED-KIM\Desktop\TX\TX IMP\signing-key-info)
# Key alias: tradex-key
```

### Tools (full paths required — not in PATH)
```powershell
# zipalign
& "C:\Users\REVAMED-KIM\AppData\Local\Android\Sdk\build-tools\36.0.0\zipalign.exe"

# adb
& "C:\Users\REVAMED-KIM\AppData\Local\Android\Sdk\platform-tools\adb.exe"
```

### Version bump (before every release)
Edit `android/app/build.gradle` — increment both:
```groovy
versionCode X      // integer, must be higher than previous
versionName "X.X"  // human-readable
```
Current: versionCode 10, versionName "1.7"

### After build — upload to Play Console
Play Console → TradeX app → Internal Testing → Create new release → Upload AAB → Save → Review → Rollout

---

## Push Notifications Architecture

### FCM Flow
1. User enables push in app (hamburger menu toggle)
2. `useFcmPush.ts` → `PushNotifications.register()` → gets FCM token
3. Token saved to Supabase `fcm_tokens` table via `POST /api/push/fcm-token`
4. Server sends FCM via `src/lib/push/fcm.ts` (uses `firebase-admin`)

### Key files
- `src/lib/push/fcm.ts` — FCM sender (server-side)
- `src/lib/push/notify.ts` — fire-and-forget broadcast helpers
- `src/lib/push/sender.ts` — Web Push sender
- `src/hooks/useFcmPush.ts` — Capacitor push notification hook
- `src/app/api/push/fcm-token/route.ts` — token CRUD
- `src/app/api/push/test/route.ts` — test endpoint (no auth)
- `src/app/api/cron/push-alerts/route.ts` — 5-min cron for alerts

### Test push notification
```
https://tradexterminal.online/api/push/test?type=signal
```
Types: `signal`, `entry`, `sltp`, `sl`, `news`, `trump`, `catalyst`

### CRITICAL FCM lessons learned (hard way)

#### 1. android.priority MUST be "high"
```typescript
android: { priority: "high" }  // bypasses Doze mode — without this, no delivery
```

#### 2. channelId MUST be "default"
Capacitor creates this channel. Any other channelId = Android silently drops notification.

#### 3. NEVER use a competing FirebaseMessagingService
Capacitor already has its own `MessagingService`. If you create a separate service
registered for `com.google.firebase.MESSAGING_EVENT`, it BREAKS delivery.

**CORRECT approach** — extend Capacitor's service:
```java
// Extend Capacitor's service, don't compete with it
public class TradeXMessagingService extends com.capacitorjs.plugins.pushnotifications.MessagingService {
    @Override
    public void onMessageReceived(RemoteMessage message) {
        super.onMessageReceived(message); // MUST call super — handles token/events
        // custom notification building with setLargeIcon() here
    }
}
```

#### 4. Data-only messages vs Notification messages
- **Notification messages** (with `notification` field): Firebase SDK displays in background — reliable delivery but no large icon control
- **Data-only messages**: `onMessageReceived` always called — full control but requires working custom service
- **Combined** (notification + data): notification shown by Firebase in background, data available in intent extras

#### 5. Large icon (notification circle like Messenger)
To show full-color TradeX logo in notification circle:
- Use `setLargeIcon(BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher_round))`
- Only works via custom service (see point 3)
- `imageUrl` in FCM = big picture in EXPANDED view (not the circle)
- Small icon (status bar) = MUST be monochrome white → use `ic_notification` drawable

---

## Android Icon Sizes

| Folder | ic_launcher | ic_launcher_foreground |
|--------|-------------|----------------------|
| mipmap-mdpi | 48×48 | 108×108 |
| mipmap-hdpi | 72×72 | 162×162 |
| mipmap-xhdpi | 96×96 | 216×216 |
| mipmap-xxhdpi | 144×144 | 324×324 |
| mipmap-xxxhdpi | 192×192 | 432×432 |

Notification small icon (monochrome): `drawable-mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi/ic_notification.png`
Sizes: 24, 36, 48, 72, 96

Source logos in `public/`:
- `app-icon-512.png` — full app icon with background (use for ic_launcher)
- `logo-transparent.png` — transparent background (use for ic_launcher_foreground and ic_notification)

### Generate icons (Node.js with sharp)
```javascript
const sharp = require('sharp');
// ic_launcher: fit: 'cover', flatten({ background: { r:10, g:14, b:26 } })
// ic_notification: convert to white-on-transparent
```

---

## Supabase Tables (push-related)
- `fcm_tokens` — columns: `id`, `user_id`, `token`, `updated_at`
  - upsert conflict: `user_id,token`
  - NO `order()` by updated_at (column doesn't exist)
- `push_subscriptions` — Web Push subscriptions

---

## Environment Variables
```
FIREBASE_SERVICE_ACCOUNT_JSON=<json>
NEXT_PUBLIC_APP_URL=https://tradexterminal.online
VAPID_PUBLIC_KEY=<key>
VAPID_PRIVATE_KEY=<key>
SUPABASE_SERVICE_ROLE_KEY=<key>
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
CRON_SECRET=<secret>
```

---

## Package name
- Android: `com.tradex.terminal`
- App ID: `online.tradexterminal.twa`

## Capacitor config
- `server.url`: `https://tradexterminal.online/m` (loads remote web app)
- `webDir`: `out`
- Background color: `#0a0e1a`
