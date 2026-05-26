"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import type { PushNotificationsPlugin } from "@capacitor/push-notifications";

export function useFcmPush() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Dynamically import to avoid SSR/web bundle issues
    import("@capacitor/push-notifications").then(({ PushNotifications }) => {
      // Only register if permission already granted — do NOT auto-request.
      // User enables via the toggle in hamburger menu.
      PushNotifications.checkPermissions().then((perm) => {
        if (perm.receive === "granted") {
          registerFcm(PushNotifications);
        }
      });

      // Handle foreground notifications
      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        const title =
          notification.title ??
          (notification.data?.title as string | undefined) ??
          "TradeX Alert";
        const body =
          notification.body ??
          (notification.data?.body as string | undefined) ??
          "";

        // Fire custom event so NotificationToast picks it up
        window.dispatchEvent(new CustomEvent("tradex-custom-notification", {
          detail: {
            id: notification.id ?? crypto.randomUUID(),
            type: (notification.data?.type as string) ?? "agent",
            title,
            body,
            timestamp: Date.now(),
            severity: (notification.data?.severity as string) ?? "high",
            chartLink: notification.data?.url as string | undefined,
          },
        }));
      });

      // Handle notification tap (app was closed/background)
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const url = action.notification.data?.url as string | undefined;
        if (url) window.location.href = url;
      });
    });
  }, []);
}

async function registerFcm(PushNotifications: PushNotificationsPlugin) {
  await PushNotifications.register();

  PushNotifications.addListener("registration", async (token) => {
    try {
      await fetch("/api/push/fcm-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.value }),
      });
    } catch {}
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.warn("[FCM] Registration error:", err);
  });
}
