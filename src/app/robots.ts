import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tradexterminal.online";

/**
 * Only the marketing surface should be crawlable. Everything behind the
 * paywall returns a redirect to /pricing for anonymous crawlers anyway, but
 * listing it explicitly keeps those URLs out of the index entirely.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/m", "/api", "/auth", "/verify-email", "/reset-password"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
