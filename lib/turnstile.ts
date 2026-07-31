// A Turnstile sitekey is public by design; only the matching secret is private.
export const TURNSTILE_PROFILE_REVIEW_SITEKEY = "0x4AAAAAAECZe_l01l17LH64";
export const TURNSTILE_PROFILE_REVIEW_ACTION = "profile_review";

const productionHostnames = new Set(["chile3x.cl"]);
const localHostnames = new Set(["localhost", "127.0.0.1"]);

export function expectedTurnstileHostnames(requestUrl: string) {
  const hostname = new URL(requestUrl).hostname.toLowerCase();
  if (productionHostnames.has(hostname)) return productionHostnames;
  if (localHostnames.has(hostname)) return localHostnames;
  return new Set<string>();
}
