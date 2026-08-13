import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin } from "@/lib/auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const responseHeaders = { "cache-control": "no-store, max-age=0" };

function response(payload: { exists: boolean }, status = 200) {
  return NextResponse.json(payload, { status, headers: responseHeaders });
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return response({ exists: false }, 403);
  }

  let email = "";
  try {
    const payload = await request.json() as { email?: unknown };
    email = typeof payload.email === "string" ? payload.email.trim().toLowerCase().slice(0, 160) : "";
  } catch {
    return response({ exists: false }, 400);
  }

  if (!emailPattern.test(email)) return response({ exists: false });

  try {
    const [account] = await (await getDb()).select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    return response({ exists: Boolean(account) });
  } catch (error) {
    console.error("Email availability check failed", error);
    return response({ exists: false }, 503);
  }
}
