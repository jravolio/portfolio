import type { Metadata } from "next";
import Link from "next/link";
import { getContent } from "@/data/resume";
import { getPostsMeta } from "@/lib/blog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lng: string }>;
}): Promise<Metadata> {
  const { lng } = await params;
  const t = getContent(lng);
  return { title: t.headings.writing, alternates: { canonical: `/${lng}/writing` } };
}

export default async function WritingPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = await params;
  const t = getContent(lng);
  const posts = await getPostsMeta();

  // Year-grouped, MM-DD per entry. A portfolio with no dates reads as frozen.
  const byYear = new Map<string, typeof posts>();
  for (const p of posts) {
    const year = (p.publishedAt ?? "").slice(0, 4) || "—";
    byYear.set(year, [...(byYear.get(year) ?? []), p]);
  }

  return (
    <div className="pt-10">
      <h1 className="text-display-2 text-ink-hi">{t.headings.writing}</h1>

      {posts.length === 0 ? (
        <p className="mt-6 text-body text-dim">—</p>
      ) : (
        [...byYear.entries()].map(([year, group]) => (
          <section key={year} className="mt-10">
            <h2 data-numeric className="border-b border-rule pb-1 text-chrome text-dim">
              {year}
            </h2>
            <ul>
              {group.map((post) => (
                <li key={post.slug} className="border-b border-rule">
                  <Link
                    href={`/${lng}/writing/${post.slug}`}
                    className="flex flex-wrap items-baseline gap-x-4 py-3 hover:text-amber"
                  >
                    <time data-numeric className="text-chrome text-dim">
                      {(post.publishedAt ?? "").slice(5)}
                    </time>
                    <span className="text-body">{post.title}</span>
                    <span className="text-chrome text-dim">{post.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
