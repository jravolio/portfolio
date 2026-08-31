import type { Metadata } from "next";
import type { BlogPosting, WithContext } from "schema-dts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent, LOCALES, SITE } from "@/data/resume";
import { getPost, getSlugs, readPost } from "@/lib/blog";

export async function generateStaticParams() {
  const slugs = await getSlugs();
  return LOCALES.flatMap((lng) => slugs.map((slug) => ({ lng, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lng: string; slug: string }>;
}): Promise<Metadata> {
  const { lng, slug } = await params;
  // Frontmatter only. getPost would run the whole Shiki pipeline for a title.
  const parsed = await readPost(slug);
  if (!parsed) return {};
  const meta = parsed.data as { title: string; summary: string; publishedAt: string };
  return {
    title: meta.title,
    description: meta.summary,
    alternates: { canonical: `/${lng}/writing/${slug}` },
    openGraph: {
      title: meta.title,
      description: meta.summary,
      type: "article",
      publishedTime: meta.publishedAt,
      url: `${SITE.url}/${lng}/writing/${slug}`,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ lng: string; slug: string }>;
}) {
  const { lng, slug } = await params;
  const t = getContent(lng);
  const post = await getPost(slug);
  if (!post) notFound();

  const jsonLd: WithContext<BlogPosting> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.metadata.title,
    description: post.metadata.summary,
    datePublished: post.metadata.publishedAt,
    dateModified: post.metadata.publishedAt,
    url: `${SITE.url}/${lng}/writing/${slug}`,
    author: { "@id": `${SITE.url}/#person` },
  };

  return (
    <article className="pt-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Link href={`/${lng}/writing`} className="chrome-link text-chrome">
        ← {t.headings.writing}
      </Link>
      <h1 className="mt-6 text-display-2 text-ink-hi">{post.metadata.title}</h1>
      <p className="mt-2 text-body text-dim">{post.metadata.summary}</p>
      <time data-numeric className="mt-1 block text-chrome text-dim">
        {post.metadata.publishedAt}
      </time>
      <div
        className="prose-terminal prose mt-10 dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: post.source }}
      />
    </article>
  );
}
