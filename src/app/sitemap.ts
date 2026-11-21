import type { MetadataRoute } from "next";

import { getRupee } from "@/lib/rupee";
import { wardSlug } from "@/lib/rupee/slug";
import { siteOrigin } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = (await siteOrigin())?.origin ?? "https://rastabaaz.example";
  const now = new Date();
  const staticRoutes = ["/", "/map", "/wards", "/contractors", "/privacy", "/terms"].map(
    (path) => ({
      url: `${origin}${path}`,
      lastModified: now,
    }),
  );
  const wardRoutes = getRupee().overview.wards.map((row) => ({
    url: `${origin}/wards/${wardSlug(row.code)}`,
    lastModified: now,
  }));
  return [...staticRoutes, ...wardRoutes];
}
