import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { AgencyError } from "@/lib/agency-management";
import { CollaborationConflict } from "@/lib/collaboration";

export async function agencyRoute(
  request: Request,
  action: (
    user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
    form: FormData,
  ) => Promise<unknown>,
  success = "Operación completada.",
) {
  const headers = {
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow",
  };
  const json = request.headers.get("accept")?.includes("application/json");
  try {
    try {
      assertSameOrigin(request);
    } catch {
      throw new AgencyError("Solicitud no válida.", 403);
    }
    const user = await getCurrentUser();
    if (!user)
      throw new AgencyError(
        "Ingresa para gestionar tus agencias y anuncios.",
        401,
      );
    await action(user, await request.formData());
    const url = new URL("/mi-cuenta", request.url);
    url.searchParams.set("agency_message", success);
    url.hash = "agency-feedback";
    return json
      ? Response.json({ redirectTo: url.toString() }, { headers })
      : Response.redirect(url, 303);
  } catch (cause) {
    const status =
      cause instanceof AgencyError
        ? cause.status
        : cause instanceof CollaborationConflict
          ? 409
          : 500;
    const error =
      cause instanceof AgencyError || cause instanceof CollaborationConflict
        ? cause.message
        : "No se confirmó la operación. Revisa el estado actual antes de repetirla.";
    if (status === 500) console.error("Agency operation failed", { cause });
    if (json) return Response.json({ error }, { status, headers });
    const url = new URL("/mi-cuenta", request.url);
    url.searchParams.set("agency_error", "1");
    url.searchParams.set("agency_message", error);
    url.hash = "agency-feedback";
    return Response.redirect(url, 303);
  }
}
