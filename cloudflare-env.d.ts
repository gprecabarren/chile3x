// Binding types are generated from wrangler.json in worker-configuration.d.ts.
// Only deployed secrets are declared here because secret values never belong
// in the Wrangler configuration or source control.
interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: { changes?: number; duration?: number; rows_read?: number; rows_written?: number };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1ExecResult { count: number; duration: number; }

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

interface R2ObjectBody extends R2Object { body: ReadableStream; }

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(key: string, value: ArrayBuffer | ReadableStream | string | Blob, options?: { httpMetadata?: R2HTTPMetadata; customMetadata?: Record<string, string>; storageClass?: "Standard" | "InfrequentAccess" }): Promise<R2Object | null>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: { limit?: number; cursor?: string; prefix?: string; include?: ("httpMetadata" | "customMetadata")[] }): Promise<{ objects: R2Object[]; truncated: boolean; cursor?: string }>;
}

interface SendEmail {
  send(message: { to: string | string[]; from: string | { email: string; name?: string }; subject: string; html: string; text: string }): Promise<{ messageId: string }>;
}

interface Queue<Body = unknown> {
  send(message: Body, options?: { delaySeconds?: number; contentType?: "json" | "text" | "bytes" | "v8" }): Promise<unknown>;
  sendBatch(messages: Iterable<{ body: Body; delaySeconds?: number; contentType?: "json" | "text" | "bytes" | "v8" }>, options?: { delaySeconds?: number }): Promise<unknown>;
}

interface Message<Body = unknown> {
  readonly id: string;
  readonly timestamp: Date;
  readonly body: Body;
  readonly attempts: number;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

interface MessageBatch<Body = unknown> {
  readonly queue: string;
  readonly messages: readonly Message<Body>[];
  ackAll(): void;
  retryAll(options?: { delaySeconds?: number }): void;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface ScheduledController { readonly scheduledTime: number; readonly cron: string; }

interface ExportedHandler<Environment = unknown, QueueBody = unknown> {
  fetch?(request: Request, env: Environment, ctx: ExecutionContext): Response | Promise<Response>;
  queue?(batch: MessageBatch<QueueBody>, env: Environment, ctx: ExecutionContext): void | Promise<void>;
  scheduled?(controller: ScheduledController, env: Environment, ctx: ExecutionContext): void | Promise<void>;
}

interface SubtleCrypto {
  timingSafeEqual(first: BufferSource, second: BufferSource): boolean;
}

interface Env {
  ASSETS: Fetcher;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  // Optional free transactional-email fallback. Both are deployed as Worker
  // secrets, never stored in D1 or exposed to the browser.
  GOOGLE_APPS_SCRIPT_URL?: string;
  GOOGLE_APPS_SCRIPT_SECRET?: string;
  TURNSTILE_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
}

declare module "cloudflare:workers" {
  export const env: Env;
}
