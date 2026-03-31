"use client";

import { MobileLayout } from "@/components/layout/MobileLayout";

// Dedicated mobile entry point — used by the Android/iOS APK via Capacitor
// No detection needed: this route always renders the mobile UI
export default function MobilePage() {
  return <MobileLayout />;
}
