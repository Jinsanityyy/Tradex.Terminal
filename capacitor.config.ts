import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tradex.terminal",
  appName: "TradeX",
  webDir: "out",
  server: {
    url: "https://tradex-ten.vercel.app/dashboard?native=1",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0a0e1a",
  },
};

export default config;
