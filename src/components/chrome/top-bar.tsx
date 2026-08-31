import Link from "next/link";
import { DeviceToggle } from "@/components/chrome/device-toggle";
import { getContent, SITE, type Locale } from "@/data/resume";

/**
 * Four nav items, lowercase, one of them weird. `render` is the weird one and
 * it is the most important page on the site: it is what turns the field
 * from art direction into an engineering artifact.
 */
export function TopBar({ lng }: { lng: Locale }) {
  const t = getContent(lng);
  const other: Locale = lng === "pt" ? "en" : "pt";

  const items = [
    { href: `/${lng}`, label: t.nav.index },
    { href: `/${lng}/work`, label: t.nav.work },
    { href: `/${lng}/writing`, label: t.nav.writing },
    { href: `/${lng}/render`, label: t.nav.render },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-bg/85 backdrop-blur-[2px]">
      <div className="mx-auto flex max-w-[min(100%-2rem,896px)] items-center justify-between gap-4 py-2">
        <nav aria-label="Primary" className="flex items-center gap-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-chrome text-dim transition-colors duration-150 hover:text-amber focus-visible:text-amber"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={`/${other}`}
            hrefLang={other}
            className="text-chrome text-dim hover:text-amber"
          >
            {t.ui.lang}
          </Link>
          <a
            href={SITE.github}
            className="text-chrome text-dim hover:text-amber"
            rel="me noreferrer"
            target="_blank"
          >
            github
          </a>
          <DeviceToggle label={t.ui.theme} />
        </div>
      </div>
    </header>
  );
}
