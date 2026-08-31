import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
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

async function readPostFile(slug: string) {
  const raw = await readFile(path.join(CONTENT_DIR, `${slug}.mdx`), "utf8");
  return matter(raw);
}

export async function getPost(slug: string) {
  // Reject traversal before it reaches the filesystem.
  if (!/^[a-z0-9_-]+$/i.test(slug)) return null;

  let parsed: ReturnType<typeof matter>;
  try {
    parsed = await readPostFile(slug);
  } catch (err) {
    // Only a genuinely absent file is a 404. Catching everything here once made
    // a broken Shiki theme look exactly like a missing post, which is a long
    // way to travel for a one-line bug.
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw err;
  }

  return {
    slug,
    source: await markdownToHTML(parsed.content),
    metadata: parsed.data as Omit<PostMeta, "slug">,
  };
}

export async function getSlugs() {
  try {
    const files = await readdir(CONTENT_DIR);
    return files.filter((f) => path.extname(f) === ".mdx").map((f) => path.basename(f, ".mdx"));
  } catch {
    return [];
  }
}

/** Metadata only: never parses the body, so listing pages stay cheap. */
export async function getPostsMeta(): Promise<PostMeta[]> {
  const slugs = await getSlugs();
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const { data } = await readPostFile(slug);
      return { slug, ...(data as Omit<PostMeta, "slug">) };
    }),
  );
  return posts.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}
