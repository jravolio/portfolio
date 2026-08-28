import type { Metadata } from "next";
import type { BlogPosting, WithContext } from "schema-dts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent, LOCALES, SITE } from "@/data/resume";
import { getPost, getSlugs } from "@/lib/blog";

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
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.metadata.title,
    description: post.metadata.summary,
    alternates: { canonical: `/${lng}/writing/${slug}` },
    openGraph: {
      title: post.metadata.title,
      description: post.metadata.summary,
      type: "article",
      publishedTime: post.metadata.publishedAt,
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
      <Link href={`/${lng}/writing`} className="text-chrome text-dim hover:text-amber">
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
