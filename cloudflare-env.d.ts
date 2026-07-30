// Minimal Cloudflare binding declarations used by the application source.
// Runtime bindings are supplied by the Cloudflare Vite plugin and Worker.
interface D1Database {}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface R2Bucket {}

interface Env {
  DB: D1Database;
}

declare module "cloudflare:workers" {
  export const env: Env;
}
