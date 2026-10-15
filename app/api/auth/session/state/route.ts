import { getBrowserSessionView } from "@/lib/browser-session-view";

export async function GET() {
  return Response.json(await getBrowserSessionView(), { headers: {
    "cache-control": "private, no-store, max-age=0",
    "x-robots-tag": "noindex, nofollow",
    vary: "Cookie",
  } });
}
