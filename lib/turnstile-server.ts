const productionHostnames = new Set(["chile3x.cl"]);
const localHostnames = new Set(["localhost", "127.0.0.1"]);
type TurnstileResult = { success?: boolean; action?: string; hostname?: string };

function expectedTurnstileHostnames(requestUrl: string) {
  const hostname = new URL(requestUrl).hostname.toLowerCase();
  if (productionHostnames.has(hostname)) return productionHostnames;
  if (localHostnames.has(hostname)) return localHostnames;
  return new Set<string>();
}

export async function verifyTurnstile(request: Request, token: unknown, expectedAction: string) {
  const expectedHostnames = expectedTurnstileHostnames(request.url);
  const { env } = await import("cloudflare:workers");
  if (typeof token !== "string" || token.length === 0 || token.length > 2048 || expectedHostnames.size === 0 || !env.TURNSTILE_SECRET) return false;
  try {
    const remoteip = request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(10_000), body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, ...(remoteip ? { remoteip } : {}) }) });
    if (!response.ok) return false;
    const result = await response.json() as TurnstileResult;
    return Boolean(result.success && result.action === expectedAction && result.hostname && expectedHostnames.has(result.hostname));
  } catch { return false; }
}
