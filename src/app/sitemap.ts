import type { MetadataRoute } from "next";
import { SITE } from "@/data/resume";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE.url, changeFrequency: "monthly", priority: 1 }];
}
