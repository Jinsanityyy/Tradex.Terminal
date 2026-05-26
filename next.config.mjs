import withPWA from "next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    // Never cache API routes — always fetch from network
    {
      urlPattern: /^https?.+\/api\//,
      handler: "NetworkOnly",
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Expose VAPID public key to the client (it's meant to be public)
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY ?? "",
  },
};

export default pwaConfig(nextConfig);
