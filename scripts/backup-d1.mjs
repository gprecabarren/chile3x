import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const required = ["CF_ACCOUNT_ID", "CF_D1_DATABASE_ID", "CF_D1_EXPORT_TOKEN"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const accountId = process.env.CF_ACCOUNT_ID;
const databaseId = process.env.CF_D1_DATABASE_ID;
const token = process.env.CF_D1_EXPORT_TOKEN;
const outputDirectory = process.env.BACKUP_OUTPUT_DIRECTORY ?? "backups/database";
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/export`;

function messageFrom(payload) {
  const messages = Array.isArray(payload?.messages)
    ? payload.messages.map((message) => message.message ?? String(message))
    : [];
  return messages.filter(Boolean).join("; ");
}

async function exportRequest(body) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(`Cloudflare D1 export failed (${response.status}): ${messageFrom(payload) || "unknown error"}`);
  }
  return payload?.result ?? payload;
}

const initial = await exportRequest({ output_format: "polling" });
const bookmark = initial?.at_bookmark;

if (!bookmark && initial?.status !== "complete") {
  throw new Error("Cloudflare did not return an export bookmark.");
}

let completed = initial;
for (let attempt = 0; completed?.status !== "complete" && attempt < 120; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 5_000));
  completed = await exportRequest({
    output_format: "polling",
    current_bookmark: bookmark,
  });

  if (completed?.status === "error") {
    throw new Error(`Cloudflare D1 export failed: ${completed.error || messageFrom(completed) || "unknown error"}`);
  }
}

if (completed?.status !== "complete" || !completed?.result?.signed_url) {
  throw new Error("Cloudflare D1 export did not finish within 10 minutes.");
}

const download = await fetch(completed.result.signed_url);
if (!download.ok) {
  throw new Error(`Could not download D1 export (${download.status}).`);
}

const requestedFilename = completed.result.filename || `chile3x-db-${new Date().toISOString().slice(0, 10)}.sql`;
const filename = path.basename(requestedFilename).replace(/[^a-zA-Z0-9._-]/g, "-");
const destination = path.join(outputDirectory, filename);

await mkdir(outputDirectory, { recursive: true });
await writeFile(destination, Buffer.from(await download.arrayBuffer()));
console.log(`D1 export downloaded to ${destination}`);
