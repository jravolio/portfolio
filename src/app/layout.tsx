import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE } from "@/data/resume";
import { display, text } from "./fonts";
import "./globals.css";

const title = `${SITE.name}, ${SITE.title}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title,
  description: SITE.summary,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description: SITE.summary,
    url: SITE.url,
    siteName: SITE.name,
    locale: "en_US",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description: SITE.summary },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#0d1220" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
