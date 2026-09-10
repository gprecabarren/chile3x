export type SessionAuthMethod = "password" | "google" | "github" | "reactivation" | "unknown";

type HeaderReader = { get(name: string): string | null };

type CloudflareRequest = Request & {
  cf?: {
    country?: string | null;
    region?: string | null;
    city?: string | null;
    timezone?: string | null;
  };
};

export type SessionContext = {
  ipAddress: string | null;
  userAgent: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
};

function clean(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maxLength) : null;
}

function ipFromHeaders(headers: HeaderReader) {
  const direct = clean(headers.get("cf-connecting-ip"), 64);
  if (direct) return direct;
  const forwarded = clean(headers.get("x-forwarded-for"), 256);
  return forwarded?.split(",")[0]?.trim().slice(0, 64) || null;
}

export function sessionContextFromHeaders(headers: HeaderReader): SessionContext {
  return {
    ipAddress: ipFromHeaders(headers),
    userAgent: clean(headers.get("user-agent"), 512),
    countryCode: clean(headers.get("cf-ipcountry"), 2)?.toUpperCase() ?? null,
    region: null,
    city: null,
    timezone: null,
  };
}

export function sessionContextFromRequest(request: Request): SessionContext {
  const fallback = sessionContextFromHeaders(request.headers);
  const cf = (request as CloudflareRequest).cf;
  return {
    ...fallback,
    countryCode: clean(cf?.country, 2)?.toUpperCase() ?? fallback.countryCode,
    region: clean(cf?.region, 120),
    city: clean(cf?.city, 120),
    timezone: clean(cf?.timezone, 80),
  };
}

export function describeUserAgent(userAgent: string | null) {
  const value = userAgent ?? "";
  const browser = /Edg\//.test(value) ? "Microsoft Edge"
    : /OPR\//.test(value) ? "Opera"
      : /SamsungBrowser\//.test(value) ? "Samsung Internet"
        : /CriOS\//.test(value) ? "Google Chrome"
          : /Chrome\//.test(value) ? "Google Chrome"
            : /FxiOS\//.test(value) || /Firefox\//.test(value) ? "Mozilla Firefox"
              : /Safari\//.test(value) && /Version\//.test(value) ? "Safari"
                : "Navegador desconocido";
  const operatingSystem = /Windows NT/.test(value) ? "Windows"
    : /Android/.test(value) ? "Android"
      : /iPhone|iPad|iPod/.test(value) ? "iOS/iPadOS"
        : /Macintosh|Mac OS X/.test(value) ? "macOS"
          : /Linux/.test(value) ? "Linux"
            : "sistema desconocido";
  const device = /iPad|Tablet/.test(value) ? "Tablet"
    : /Mobi|Android|iPhone|iPod/.test(value) ? "Móvil"
      : value ? "Computador" : "Dispositivo desconocido";
  return { browser, operatingSystem, device, label: `${browser} en ${operatingSystem}` };
}

export function countryName(countryCode: string | null) {
  if (!countryCode || countryCode.length !== 2) return null;
  try {
    return new Intl.DisplayNames(["es-CL"], { type: "region" }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

export function sessionLocation(session: Pick<SessionContext, "city" | "region" | "countryCode">) {
  return [session.city, session.region, countryName(session.countryCode)].filter(Boolean).join(", ") || "Ubicación no disponible";
}
