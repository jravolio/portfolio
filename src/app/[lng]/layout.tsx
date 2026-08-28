import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { StatusBar } from "@/components/chrome/status-bar";
import { TopBar } from "@/components/chrome/top-bar";
import { ThemeProvider } from "@/components/theme-provider";
import { getContent, LOCALES, SITE, type Locale } from "@/data/resume";
import { commit, departure } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return LOCALES.map((lng) => ({ lng }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lng: string }>;
}): Promise<Metadata> {
  const { lng } = await params;
  const t = getContent(lng);
  const title = `${SITE.name} — ${t.tagline}`;

  return {
    metadataBase: new URL(SITE.url),
    title: { default: title, template: `%s · ${SITE.name}` },
    description: t.identity,
    alternates: {
      canonical: `/${lng}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      title,
      description: t.identity,
      url: `${SITE.url}/${lng}`,
      siteName: SITE.name,
      locale: lng === "pt" ? "pt_BR" : "en_US",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description: t.identity },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7EA" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1314" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lng: string }>;
}) {
  const { lng } = await params;
  const t = getContent(lng);

  return (
    <html lang={lng} suppressHydrationWarning className={`${departure.variable} ${commit.variable}`}>
      <body className="min-h-dvh antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-amber focus:bg-bg focus:px-3 focus:py-1 focus:text-chrome"
          >
            {t.ui.skipToContent}
          </a>

          <TopBar lng={lng as Locale} />

          <main id="main" className="mx-auto w-full max-w-[min(100%-2rem,896px)] pb-24">
            {children}
          </main>

          <footer className="mt-16">
            <StatusBar
              items={[
                `locale ${lng}`,
                "departure mono 11px",
                "commit mono 16/28",
                "cell 7x14px",
                "aspect 0.500",
                "schwarzschild a=0",
                "b_crit 2.598 r_s",
                "no analytics beyond page counts",
              ]}
            />
            <div className="mx-auto flex max-w-[min(100%-2rem,896px)] flex-wrap items-center justify-between gap-2 py-4 text-chrome text-dim">
              <span>
                {SITE.name} · {SITE.location[lng === "pt" ? "pt" : "en"]}
              </span>
              <Link href={`/${lng}/render`} className="hover:text-amber">
                {t.ui.readRender} →
              </Link>
            </div>
          </footer>

          {/* Aperture grille. Dark theme only, 3px period, 5.5% opacity. */}
          <div className="grille" aria-hidden="true" />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
