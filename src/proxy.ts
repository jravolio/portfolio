import acceptLanguage from "accept-language";
import { type NextRequest, NextResponse } from "next/server";
import { cookieName, fallbackLng, languages } from "./lib/i18n";

acceptLanguage.languages([...languages]);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|static|assets|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpe?g|webp|svg|txt|woff2)$).*)",
  ],
};

// Renamed from `middleware` in Next 16. The proxy runtime is nodejs and cannot
// be set to edge; this Accept-Language redirect is fine on nodejs.
export function proxy(req: NextRequest) {
  let lng: string | null | undefined;

  const cookie = req.cookies.get(cookieName);
  if (cookie) lng = acceptLanguage.get(cookie.value);
  if (!lng) lng = acceptLanguage.get(req.headers.get("Accept-Language"));
  if (!lng) lng = fallbackLng;

  const { pathname } = req.nextUrl;

  if (
    !languages.some((loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) &&
    !pathname.startsWith("/_next")
  ) {
    return NextResponse.redirect(new URL(`/${lng}${pathname}`, req.url));
  }

  const referer = req.headers.get("referer");
  if (referer) {
    const refererUrl = new URL(referer);
    const lngInReferer = languages.find(
      (l) => refererUrl.pathname === `/${l}` || refererUrl.pathname.startsWith(`/${l}/`),
    );
    const response = NextResponse.next();
    if (lngInReferer) response.cookies.set(cookieName, lngInReferer);
    return response;
  }

  return NextResponse.next();
}
