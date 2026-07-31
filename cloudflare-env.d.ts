// Minimal Cloudflare binding declarations used by the application source.
// Runtime bindings are supplied by the Cloudflare Vite plugin and Worker.
interface D1Database {}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface R2HTTPMetadata {
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
}

interface R2Object {
  key: string;
  size: number;
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream;
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(key: string, value: ArrayBuffer | ReadableStream | string | Blob, options?: {
    httpMetadata?: R2HTTPMetadata;
    customMetadata?: Record<string, string>;
    storageClass?: "Standard" | "InfrequentAccess";
  }): Promise<R2Object | null>;
  delete(keys: string | string[]): Promise<void>;
}

interface SendEmail {
  send(message: {
    to: string | string[];
    from: string | { email: string; name?: string };
    subject: string;
    html: string;
    text: string;
  }): Promise<{ messageId: string }>;
}

interface Env {
  DB: D1Database;
  MEDIA?: R2Bucket;
  EMAIL?: SendEmail;
  TURNSTILE_SECRET?: string;
}

declare module "cloudflare:workers" {
  export const env: Env;
}
