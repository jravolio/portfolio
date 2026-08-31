import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { terminalTheme } from "./shiki-theme";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type PostMeta = {
  slug: string;
  title: string;
  publishedAt: string;
  summary: string;
  image?: string;
};

export async function markdownToHTML(markdown: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypePrettyCode, {
      // Bound to this site's own tokens. Any bundled theme would ship a second,
      // conflicting palette inside the code blocks. Shiki's old `css-variables`
      // theme was removed in v1, so this is a real theme emitting var().
      theme: terminalTheme,
      keepBackground: false,
    })
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}

/**
 * A slug that can appear in a URL. Applied to filesystem names as well as
 * request params: a file whose name cannot be a slug cannot have a route
 * generated for it either, so it is not publishable in the first place.
 */
const isPublishableSlug = (slug: string) => /^[a-z0-9_-]+$/i.test(slug);

/**
 * Frontmatter and body for one post.
 *
 * Cached per request: a post page calls this from both `generateMetadata` and
 * the component, and `generateStaticParams` emits one route per locale - so an
 * uncached read is four file reads for the same bytes.
 */
export const readPost = cache(async (slug: string) => {
  // Reject traversal before it reaches the filesystem.
  if (!isPublishableSlug(slug)) return null;
  try {
    const raw = await readFile(path.join(CONTENT_DIR, `${slug}.mdx`), "utf8");
    return matter(raw);
  } catch (err) {
    // Only a genuinely absent file is a 404. Catching everything here once made
    // a broken Shiki theme look exactly like a missing post, which is a long
    // way to travel for a one-line bug.
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw err;
  }
});

/**
 * The rendered post. Shiki is the most expensive thing in the build, so this is
 * cached too - and `generateMetadata` deliberately calls `readPost` instead, to
 * avoid compiling a body it only wants the frontmatter from.
 */
export const getPost = cache(async (slug: string) => {
  const parsed = await readPost(slug);
  if (!parsed) return null;
  return {
    slug,
    source: await markdownToHTML(parsed.content),
    metadata: parsed.data as Omit<PostMeta, "slug">,
  };
});

export const getSlugs = cache(async () => {
  try {
    const files = await readdir(CONTENT_DIR);
    return files
      .filter((f) => path.extname(f) === ".mdx")
      .map((f) => path.basename(f, ".mdx"))
      .filter(isPublishableSlug);
  } catch {
    return [];
  }
});

/** Metadata only: never parses the body, so listing pages stay cheap. Cached
 *  because the sitemap, both index pages and both writing indexes all want it. */
export const getPostsMeta = cache(async (): Promise<PostMeta[]> => {
  const slugs = await getSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const parsed = await readPost(slug);
      return parsed ? { slug, ...(parsed.data as Omit<PostMeta, "slug">) } : null;
    }),
  );
  // getSlugs has already dropped unpublishable names, so a null here means the
  // file disappeared between readdir and read. Surface it rather than quietly
  // shipping a shorter index than the author wrote.
  const missing = slugs.filter((_, i) => posts[i] === null);
  if (missing.length) throw new Error(`post file vanished during build: ${missing.join(", ")}`);

  return (posts as PostMeta[]).sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
});
