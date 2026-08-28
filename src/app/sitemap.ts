import type { MetadataRoute } from "next";
import { LOCALES, SITE } from "@/data/resume";
import { getPostsMeta } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPostsMeta();
  const pages = ["", "/work", "/writing", "/render"];

  const routes = LOCALES.flatMap((lng) =>
    pages.map((page) => ({
      url: `${SITE.url}/${lng}${page}`,
      changeFrequency: page === "/writing" ? ("weekly" as const) : ("monthly" as const),
      priority: page === "" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE.url}/${l}${page}`])),
      },
    })),
  );

  const postRoutes = LOCALES.flatMap((lng) =>
    posts.map((p) => ({
      url: `${SITE.url}/${lng}/writing/${p.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  );

  return [...routes, ...postRoutes];
}
