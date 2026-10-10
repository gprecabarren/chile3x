import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { accountAppleIdentities, accountAuthEvents, accountGoogleIdentities, accountXIdentities, authSessions, users } from "@/db/schema";
import { assertSameOrigin, createUserSession, getCurrentUser, getUserSessionCookieName, getUserSessionDuration, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { revokeAppleGrantForUser } from "@/lib/apple-account";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const user = await getCurrentUser();
  if (!user || user.role === "admin") return new Response("No autorizado.", { status: 403 });
  const destination = (notice: string) => NextResponse.redirect(new URL(`/mi-cuenta/datos-personales?notice=${notice}#accesos`, request.url), 303);
  const form = await request.formData();
  const provider = form.get("provider");
  if (form.get("confirmation") !== "unlink" || !["google", "apple", "x"].includes(String(provider))) return destination("unlink_error");
  const db = await getDb();
  const [account] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!account?.passwordHash) return destination("password_required");
  const password = String(form.get("current_password") ?? "");
  if (password.length > 256 || !await verifyPassword(password, account.passwordHash)) return destination("unlink_password");
  const table = provider === "google" ? accountGoogleIdentities : provider === "apple" ? accountAppleIdentities : accountXIdentities;
  const [linked] = await db.select({ id: table.id }).from(table).where(eq(table.userId, user.id)).limit(1);
  if (!linked) return destination("unlink_error");
  try {
    if (provider === "apple") await revokeAppleGrantForUser(user.id);
    await db.batch([
      db.delete(table).where(and(eq(table.userId, user.id), eq(table.id, linked.id))),
      db.insert(accountAuthEvents).values({ id: `auth_event_${crypto.randomUUID()}`, userId: user.id, provider: provider as "google" | "apple" | "x", action: "unlinked", createdAt: new Date().toISOString() }),
      db.delete(authSessions).where(eq(authSessions.userId, user.id)),
    ]);
    // Rotate onto password access; emailVerifiedAt and original registration method are untouched.
    const response = destination("provider_unlinked");
    response.cookies.set({ name: getUserSessionCookieName(), value: await createUserSession(user.id, request, "password"), ...sessionCookieOptions(getUserSessionDuration()) });
    return response;
  } catch { return destination("unlink_error"); }
}
