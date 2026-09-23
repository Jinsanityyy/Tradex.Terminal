import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { IBM_Plex_Mono } from "next/font/google";

// Two families, terminal-style: Geist Sans for words, IBM Plex Mono for every
// number, price and code. The old font variables (geist-mono, jetbrains-mono,
// dm-sans, space-grotesk) are aliased to these two in globals.css.
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

import { SWRProvider } from "@/components/providers/SWRProvider";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AudioUnlocker } from "@/components/providers/AudioUnlocker";
import { Toaster } from "sonner";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0D0E10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tradexterminal.online";
const SITE_DESC =
  "A multi-agent market read for Gold, Forex, Crypto and Indices. Seven agents analyse trend, price action, news, risk and positioning, then show you the context behind the move.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TradeX Terminal",
    template: "%s · TradeX Terminal",
  },
  description: SITE_DESC,
  applicationName: "TradeX Terminal",
  keywords: [
    "trading terminal", "gold analysis", "XAUUSD", "forex", "market bias",
    "trading dashboard", "market analysis", "economic calendar",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TradeX",
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
  },
  // Without these, every link shared to X / Facebook / Discord / Telegram
  // renders as a bare URL with no title, blurb or image.
  openGraph: {
    type: "website",
    siteName: "TradeX Terminal",
    title: "TradeX Terminal",
    description: SITE_DESC,
    url: SITE_URL,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "TradeX Terminal" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeX Terminal",
    description: SITE_DESC,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${ibmPlexMono.variable}`}>
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body className="min-h-screen antialiased">
        <SettingsProvider>
          <SWRProvider>{children}</SWRProvider>
          <AudioUnlocker />
        </SettingsProvider>
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
