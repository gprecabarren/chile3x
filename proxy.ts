import { NextResponse, type NextRequest } from "next/server";

const productionHosts = new Set(["chile3x.cl", "www.chile3x.cl"]);

function visitorUsesHttps(request: NextRequest) {
  const visitor = request.headers.get("cf-visitor");

  if (visitor) {
    try {
      const scheme = JSON.parse(visitor).scheme;

      if (scheme === "http" || scheme === "https") {
        return scheme === "https";
      }
    } catch {
      // Fall through to the protocol headers when Cloudflare sends malformed data.
    }
  }

  return request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

export function proxy(request: NextRequest) {
  const host = request.nextUrl.hostname.toLowerCase();

  if (!productionHosts.has(host)) {
    return NextResponse.next();
  }

  const isSecure = visitorUsesHttps(request);
  const shouldUseApexDomain = host === "www.chile3x.cl";

  if (!isSecure || shouldUseApexDomain) {
    const destination = request.nextUrl.clone();
    destination.protocol = "https:";
    destination.hostname = "chile3x.cl";

    return NextResponse.redirect(destination, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
