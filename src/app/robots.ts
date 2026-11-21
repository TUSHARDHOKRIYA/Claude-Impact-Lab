import type { MetadataRoute } from "next";

import { siteOrigin } from "@/lib/site-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await siteOrigin();
  const base = origin ? origin.origin : "";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/"],
      },
    ],
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
