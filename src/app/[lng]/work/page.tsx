import type { Metadata } from "next";
import { formatPeriod, getContent, SITE } from "@/data/resume";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lng: string }>;
}): Promise<Metadata> {
  const { lng } = await params;
  const t = getContent(lng);
  return { title: t.headings.work, alternates: { canonical: `/${lng}/work` } };
}

export default async function WorkPage({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = await params;
  const t = getContent(lng);

  return (
    <div className="pt-10">
      <h1 className="text-display-2 text-ink-hi">{t.headings.work}</h1>
      <p className="mt-3 max-w-[68ch] text-body text-dim">{t.identity}</p>

      {/* A table, not a stack of cards. A monospace table is the one layout
          that genuinely belongs on a character grid, and it is where the
          text-mode conceit pays for itself. */}
      <div className="mt-10 overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{t.headings.work}</caption>
          <thead>
            <tr className="border-b border-rule text-chrome text-dim">
              <th scope="col" className="py-2 pr-6 font-normal">role</th>
              <th scope="col" className="py-2 pr-6 font-normal">org</th>
              <th scope="col" className="py-2 pr-6 font-normal">period</th>
              <th scope="col" className="py-2 font-normal">stack</th>
            </tr>
          </thead>
          <tbody>
            {t.work.map((role) => (
              <tr key={`${role.org}-${role.start}`} className="border-b border-rule align-top">
                <td className="py-3 pr-6 text-body whitespace-nowrap">{role.role}</td>
                <td className="py-3 pr-6 text-body whitespace-nowrap">
                  {role.orgUrl ? (
                    <a href={role.orgUrl} target="_blank" rel="noreferrer" className="hover:text-amber">
                      {role.org}
                    </a>
                  ) : (
                    role.org
                  )}
                  {role.via ? <span className="text-dim"> ({role.via})</span> : null}
                </td>
                <td data-numeric className="py-3 pr-6 text-chrome text-dim whitespace-nowrap">
                  {formatPeriod(role.start, role.end, t.ui.present)}
                </td>
                <td className="py-3 text-chrome text-dim">{role.stack.join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-16 space-y-12">
        {t.work.map((role) => (
          <section key={`${role.org}-${role.start}-detail`}>
            <h2 className="text-display-1 text-ink-hi">
              {role.org}
              <span className="text-dim"> · {role.role}</span>
            </h2>
            <p data-numeric className="mt-1 text-chrome text-dim">
              {formatPeriod(role.start, role.end, t.ui.present)} · {role.location}
            </p>
            <p className="mt-3 max-w-[70ch] text-body">{role.lede}</p>
            <ul className="mt-4 max-w-[70ch] space-y-2">
              {role.bullets.map((b) => (
                <li key={b} className="flex gap-3 text-body text-dim">
                  <span aria-hidden="true" className="text-amber">›</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-16 border-t border-rule pt-6">
        <h2 className="text-chrome text-dim">{t.headings.education}</h2>
        <ul className="mt-3">
          {t.education.map((e) => (
            <li key={e.school} className="flex flex-wrap items-baseline gap-x-4 py-1">
              <span className="text-body">{e.school}</span>
              <span className="text-body text-dim">{e.qualification}</span>
              <span data-numeric className="text-chrome text-dim">
                {e.start} — {e.end}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-chrome text-dim">
          {t.certifications.map((c) => `[ ${c} ]`).join(" ")}
        </p>
        <p className="mt-6 text-chrome">
          <a href={SITE.linkedin} target="_blank" rel="noreferrer" className="text-cyan hover:text-amber">
            linkedin →
          </a>
        </p>
      </section>
    </div>
  );
}
