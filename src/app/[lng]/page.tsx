import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Person, WithContext } from "schema-dts";
import Link from "next/link";
import { Hero } from "@/components/hero";
import { AttentionText } from "@/components/chrome/attention-text";
import { CopyEmail } from "@/components/chrome/copy-email";
import { SectionNav } from "@/components/chrome/section-nav";
import { getContent, SITE } from "@/data/resume";
import { getPostsMeta } from "@/lib/blog";

async function staticFrame() {
  try {
    return await readFile(join(process.cwd(), "public", "static", "galaxy.txt"), "utf8");
  } catch {
    return "";
  }
}

export default async function IndexPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = await params;
  const t = getContent(lng);
  const frame = await staticFrame();
  const posts = (await getPostsMeta()).slice(0, 3);
  const current = t.work[0]!;

  const jsonLd: WithContext<Person> = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE.url}/#person`,
    name: SITE.name,
    url: SITE.url,
    jobTitle: t.tagline,
    description: t.identity,
    email: `mailto:${SITE.email}`,
    address: { "@type": "PostalAddress", addressLocality: "Rio de Janeiro", addressCountry: "BR" },
    sameAs: [SITE.github, SITE.linkedin],
    worksFor: { "@type": "Organization", name: current.org, url: current.orgUrl },
    knowsAbout: ["Python", "Django", "React", "AWS", "Terraform", "Kubernetes", "OpenSearch"],
    knowsLanguage: ["en", "pt-BR"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON-LD is data, not executable code, so a native <script> is correct
        // here rather than next/script. `<` is escaped per Next's guidance.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <SectionNav
        sections={[
          { id: "top", label: t.nav.index },
          { id: "now", label: t.headings.now },
          { id: "work", label: t.headings.selectedWork },
          { id: "writing", label: t.headings.writing },
          { id: "off-clock", label: t.headings.offClock },
          { id: "contact", label: t.headings.contact },
        ]}
      />

      <Hero
        staticFrame={frame}
        name={SITE.name}
        identity={t.identity}
        tagline={t.tagline}
        email={SITE.email}
        linkedin={SITE.linkedin}
        github={SITE.github}
        labels={{
          halt: t.ui.halt,
          resume: t.ui.resume_playback,
          alt: t.ui.galaxyAlt,
          reducedMotionNote: t.ui.reducedMotionNote,
          copyEmail: t.ui.copyEmail,
          copied: t.ui.copied,
        }}
      />

      <section id="now" className="mt-16">
        <h2 className="text-chrome text-dim">{t.headings.now}</h2>
        <p className="mt-2 max-w-[68ch] text-body">{t.now}</p>
      </section>

      <section id="work" className="mt-16">
        <div className="flex items-baseline justify-between border-b border-rule pb-2">
          <h2 className="text-chrome text-dim">{t.headings.selectedWork}</h2>
          <Link href={`/${lng}/work`} className="text-chrome text-dim hover:text-amber">
            {t.nav.work} →
          </Link>
        </div>

        <ul className="mt-4">
          {t.projects.map((p) => {
            const href = p.live ?? p.repo!;
            const external = href.startsWith("http");
            return (
              <li key={p.slug} className="border-b border-rule py-4">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                    className="text-display-1 text-ink-hi hover:text-amber"
                  >
                    {p.name}
                  </a>
                  <span data-numeric className="text-chrome text-dim">
                    {p.year}
                  </span>
                </div>
                <p className="mt-1 max-w-[68ch] text-body text-dim">{p.blurb}</p>
                <p className="mt-2 text-chrome text-dim">
                  {p.stack.map((s) => `[ ${s} ]`).join(" ")}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {posts.length > 0 ? (
        <section id="writing" className="mt-16">
          <div className="flex items-baseline justify-between border-b border-rule pb-2">
            <h2 className="text-chrome text-dim">{t.headings.writing}</h2>
            <Link href={`/${lng}/writing`} className="text-chrome text-dim hover:text-amber">
              {t.ui.allWriting} →
            </Link>
          </div>
          <ul className="mt-4">
            {posts.map((post) => (
              <li key={post.slug} className="border-b border-rule py-3">
                <Link
                  href={`/${lng}/writing/${post.slug}`}
                  className="flex flex-wrap items-baseline gap-x-4 hover:text-amber"
                >
                  <time data-numeric className="text-chrome text-dim">
                    {post.publishedAt}
                  </time>
                  <span className="text-body">{post.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="off-clock" className="mt-16">
        <h2 className="text-chrome text-dim">{t.headings.offClock}</h2>
        <p className="mt-2 max-w-[68ch] text-body">{t.offClock}</p>
      </section>

      <section id="contact" className="mt-16">
        <AttentionText text={t.headings.contact} as="h2" />
        <p className="mt-2 max-w-[62ch] text-body text-dim">
          {SITE.email} · {SITE.tel}
        </p>
        <div className="mt-4">
          <CopyEmail email={SITE.email} labels={{ copy: t.ui.copyEmail, copied: t.ui.copied }} />
        </div>
      </section>
    </>
  );
}
