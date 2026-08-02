import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tradexterminal.online";

/** Public marketing pages only — the app itself is behind the paywall. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${SITE}/`,        lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${SITE}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/about`,   lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/globe`,   lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/terms`,   lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${SITE}/refund`,  lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];
}
