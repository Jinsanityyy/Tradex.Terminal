// Push notification handler — runs inside the service worker context.
// next-pwa bundles this into the generated public/sw.js.

const APP_ICON   = "/icon-512.png";     // TradeX logo (large, shown as notification icon)
const APP_BADGE  = "/favicon-32.png";   // Small monochrome badge (status bar)

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: "TradeX Alert", body: event.data.text() }; }

  const {
    title    = "TradeX Alert",
    body     = "",
    url      = "/dashboard",
    severity = "medium",
    tag,
    type     = "agent",
  } = payload;

  const options = {
    body,
    icon:   APP_ICON,
    badge:  APP_BADGE,
    image:  APP_ICON,                   // Big TradeX logo image below the text (Chrome)
    tag:    tag || `tradex-${type}-${Date.now()}`,
    data:   { url },
    vibrate: severity === "high"
      ? [300, 100, 300, 100, 300]
      : [200, 100, 200],
    requireInteraction: severity === "high",
    silent: false,
    actions: [
      { action: "open",    title: "Open TradeX" },
      { action: "dismiss", title: "Dismiss"     },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If a TradeX tab is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.postMessage({ type: "PUSH_NAVIGATE", url });
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
