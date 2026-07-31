import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const CHILE3X_D1_DATABASE_ID = "ee8796f0-2217-4fdb-9fee-1561c52e3ae3";

const { d1 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "chile3x-db",
          database_id: CHILE3X_D1_DATABASE_ID,
          migrations_dir: "../../drizzle",
        },
      ]
    : [],
  // Private media for profile photos. Files are served through an application
  // route after checking their moderation state; the bucket has no public URL.
  r2_buckets: [
    {
      binding: "MEDIA",
      bucket_name: "chile3x-media",
    },
  ],
  // Transactional messages only: account verification and password recovery.
  // The domain must be onboarded in Cloudflare Email Service before delivery.
  send_email: [
    {
      name: "EMAIL",
    },
  ],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
