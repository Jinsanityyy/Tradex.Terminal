import type { Metadata } from "next";
import { SWRProvider } from "@/components/providers/SWRProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeX — Market Intelligence Terminal",
  description: "Premium institutional-grade trading intelligence command center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <SWRProvider>{children}</SWRProvider>
      </body>
    </html>
  );
}
