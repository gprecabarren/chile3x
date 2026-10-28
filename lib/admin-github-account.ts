import { getGitHubOAuthConfig } from "@/lib/auth";
import { recordOperationalEvent } from "@/lib/operations";
import { validGithubLogin } from "@/lib/admin-access-validation";

/** Server-only public account lookup. Email ownership still requires OAuth /user/emails. */
export async function lookupGithubAccount(login: string, fetcher: typeof fetch = fetch): Promise<{ login: string; id: string } | { error: string }> {
  if (!validGithubLogin(login)) return { error: "invalid_login" };
  async function unavailable(cause: string, status?: number) {
    await recordOperationalEvent({ category: "authentication", eventName: "admin.github_account_check", outcome: "failure", detail: "No se pudo comprobar una cuenta de GitHub antes de autorizarla.", metadata: { cause, status } });
    return { error: "github_unavailable" };
  }
  const config = await getGitHubOAuthConfig();
  if (!config) return unavailable("missing_configuration");
  try {
    // GitHub documents OAuth-app Basic authentication for public REST data.
    // Keep credentials in the server header, never in URLs or browser code.
    const response = await fetcher(`https://api.github.com/users/${encodeURIComponent(login)}`, {
      headers: { accept: "application/vnd.github+json", authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`, "user-agent": "Chile3X-Administration", "x-github-api-version": "2026-03-10", "cache-control": "no-cache" },
      signal: AbortSignal.timeout(8_000), redirect: "manual",
    });
    if (response.status === 404) return { error: "github_missing" };
    if (!response.ok) return unavailable(response.status === 429 || response.headers.get("x-ratelimit-remaining") === "0" ? "rate_limit" : "provider_response", response.status);
    const account = await response.json() as { login?: string; id?: number; type?: string };
    if (account.type === "Organization") return { error: "github_organization" };
    if (account.type !== "User" || !Number.isSafeInteger(account.id) || Number(account.id) <= 0 || typeof account.login !== "string" || account.login.toLowerCase() !== login) return unavailable("invalid_provider_data");
    return { login: account.login.toLowerCase(), id: String(account.id) };
  } catch (cause) { return unavailable(cause instanceof Error && ["TimeoutError", "AbortError"].includes(cause.name) ? "timeout" : "request_failure"); }
}
