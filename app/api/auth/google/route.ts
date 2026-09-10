import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { accountGoogleIdentities, users } from "@/db/schema";
import { isReservedAdminEmail } from "@/lib/admin-email";
import { assertSameOrigin, createUserSession, getUserSessionCookieName, getUserSessionDuration, safeAccountReturnTo, sessionCookieOptions } from "@/lib/auth";
import { GOOGLE_NONCE_COOKIE, verifyGoogleCredential } from "@/lib/google-auth";
import { createGoogleRegistrationIntent, GOOGLE_REGISTRATION_COOKIE } from "@/lib/google-registration";
import { getSiteSettings } from "@/lib/site-settings";
import { ACCOUNT_REACTIVATION_COOKIE, ACCOUNT_REACTIVATION_DURATION_SECONDS, createAccountReactivationIntent } from "@/lib/account-reactivation";
import { recordOperationalEvent } from "@/lib/operations";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return jsonError("Solicitud no válida.", 403);
  }

  const settings = await getSiteSettings();
  const clientId = settings.google_oauth_client_id.trim();
  if (!clientId) return jsonError("El acceso con Google aún no está configurado.", 503);
  const nonce = request.cookies.get(GOOGLE_NONCE_COOKIE)?.value ?? "";
  let body: { credential?: unknown; intent?: unknown; returnTo?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return jsonError("Respuesta de Google no válida.");
  }
  if (typeof body.credential !== "string") return jsonError("Respuesta de Google no válida.");
  let identity;
  try {
    identity = await verifyGoogleCredential(body.credential, clientId, nonce);
  } catch (error) {
    console.error("Google credential verification is temporarily unavailable", { error });
    await recordOperationalEvent({ category: "authentication", eventName: "google.sign_in", outcome: "failure", detail: "No fue posible verificar temporalmente la credencial de Google." });
    return jsonError("Google no está disponible temporalmente. Inténtalo nuevamente en unos minutos.", 503);
  }
  if (!identity) return jsonError("No pudimos validar de forma segura esa cuenta de Google.", 401);
  if (await isReservedAdminEmail(identity.email)) {
    return jsonError("Ese correo está reservado para una identidad administrativa y no puede usarse como cuenta de anunciante o tester.", 409);
  }

  const returnTo = safeAccountReturnTo(typeof body.returnTo === "string" ? body.returnTo : null);
  try {
    const db = await getDb();
    const [linked] = await db.select({
      identityId: accountGoogleIdentities.id,
      userId: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      selfDisabledAt: users.selfDisabledAt,
      adminDisabledAt: users.adminDisabledAt,
    }).from(accountGoogleIdentities)
      .innerJoin(users, eq(accountGoogleIdentities.userId, users.id))
      .where(eq(accountGoogleIdentities.googleSubject, identity.subject)).limit(1);

    let account = linked;
    if (!account) {
      const [byEmail] = await db.select({ id: users.id, email: users.email, role: users.role, isActive: users.isActive, selfDisabledAt: users.selfDisabledAt, adminDisabledAt: users.adminDisabledAt })
        .from(users).where(eq(users.email, identity.email)).limit(1);
      if (byEmail?.role === "admin") return jsonError("Ese correo pertenece al panel administrativo y no puede iniciar una sesión pública.", 409);
      if (byEmail) {
        const [otherGoogleIdentity] = await db.select({ id: accountGoogleIdentities.id }).from(accountGoogleIdentities)
          .where(eq(accountGoogleIdentities.userId, byEmail.id)).limit(1);
        if (otherGoogleIdentity) return jsonError("La cuenta ya está vinculada a otra identidad de Google.", 409);
        const identityId = `google_identity_${crypto.randomUUID()}`;
        await db.insert(accountGoogleIdentities).values({
          id: identityId,
          userId: byEmail.id,
          googleSubject: identity.subject,
          googleEmail: identity.email,
        });
        account = { identityId, userId: byEmail.id, email: byEmail.email, role: byEmail.role, isActive: byEmail.isActive, selfDisabledAt: byEmail.selfDisabledAt, adminDisabledAt: byEmail.adminDisabledAt };
      }
    }

    if (account) {
      if (account.role === "admin") return jsonError("Las identidades administrativas solo ingresan mediante GitHub.", 409);
      if (account.adminDisabledAt) return jsonError("Tu cuenta fue deshabilitada por Chile3X. Solo la administración puede restablecerla; contáctanos desde la sección Contacto.", 403);
      if (account.selfDisabledAt) {
        const destination = new URL("/reactivar-cuenta", request.url);
        destination.searchParams.set("return_to", returnTo);
        const response = NextResponse.json({ redirectTo: destination.pathname + destination.search }, { headers: { "cache-control": "no-store" } });
        response.cookies.set({ name: ACCOUNT_REACTIVATION_COOKIE, value: await createAccountReactivationIntent(account.userId), ...sessionCookieOptions(ACCOUNT_REACTIVATION_DURATION_SECONDS) });
        response.cookies.delete({ name: GOOGLE_NONCE_COOKIE, path: "/api/auth/google" });
        return response;
      }
      if (!account.isActive) return jsonError("Tu cuenta fue deshabilitada por Chile3X. Contáctanos desde la sección Contacto.", 403);
      const now = new Date().toISOString();
      await db.update(accountGoogleIdentities).set({ googleEmail: identity.email, lastLoginAt: now })
        .where(eq(accountGoogleIdentities.id, account.identityId));
      await db.update(users).set({ emailVerifiedAt: now }).where(and(eq(users.id, account.userId), eq(users.email, identity.email)));
      const response = NextResponse.json({ redirectTo: returnTo }, { headers: { "cache-control": "no-store" } });
      response.cookies.set({ name: getUserSessionCookieName(), value: await createUserSession(account.userId, request, "google"), ...sessionCookieOptions(getUserSessionDuration()) });
      response.cookies.delete({ name: GOOGLE_NONCE_COOKIE, path: "/api/auth/google" });
      return response;
    }

    const registration = await createGoogleRegistrationIntent(identity);
    const registrationUrl = new URL("/registro", request.url);
    registrationUrl.searchParams.set("google", "1");
    registrationUrl.searchParams.set("return_to", returnTo);
    if (body.intent === "login") registrationUrl.searchParams.set("google_notice", "new");
    const response = NextResponse.json({ redirectTo: registrationUrl.pathname + registrationUrl.search }, { headers: { "cache-control": "no-store" } });
    response.cookies.set({
      name: GOOGLE_REGISTRATION_COOKIE,
      value: registration.value,
      ...sessionCookieOptions(registration.maxAge),
      path: "/",
    });
    response.cookies.delete({ name: GOOGLE_NONCE_COOKIE, path: "/api/auth/google" });
    return response;
  } catch (error) {
    console.error("Google sign-in failed", { error });
    await recordOperationalEvent({ category: "authentication", eventName: "google.sign_in", outcome: "failure", detail: "El proveedor de acceso con Google no pudo completar la operación." });
    return jsonError("No pudimos completar el acceso con Google. Inténtalo nuevamente.", 503);
  }
}
