import { getDb } from "@/db";
import { privateSampleIntakes } from "@/db/schema";
import { assertSameOrigin } from "@/lib/auth";
import { readMediaUploadForm, MediaUploadRequestError } from "@/lib/media-upload-form";
import { sampleForm, sampleFormJson, SAMPLE_INTAKE_ACTION } from "@/lib/private-sample-policy";
import { readProfileSubmission, ProfileValidationError } from "@/lib/profile-submission";
import { verifyTurnstile } from "@/lib/turnstile-server";
import { validLoginEmail } from "@/lib/login-form-state";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
const failure = (error: string, status: number) => Response.json({ error }, { status, headers });

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return failure("Solicitud no válida.", 403); }
  try {
    const form = await readMediaUploadForm(request, 0, 64_000);
    if ([...form.values()].some(value => typeof value !== "string")) {
      return failure("Envía la ficha solo con datos de texto.", 400);
    }
    const accountEmail = String(form.get("account_email") ?? "").trim().toLowerCase();
    if (accountEmail && (accountEmail.length > 160 || !validLoginEmail(accountEmail))) {
      return failure("Revisa el correo para tu futura cuenta.", 400);
    }
    const formJson = sampleFormJson(form);
    const { displayName, city } = readProfileSubmission(sampleForm(formJson));
    if (!await verifyTurnstile(request, form.get("cf-turnstile-response"), SAMPLE_INTAKE_ACTION)) {
      return failure("Completa nuevamente la verificación de seguridad para enviar la ficha.", 403);
    }
    await (await getDb()).insert(privateSampleIntakes).values({
      id: `int_${crypto.randomUUID()}`, displayName, city, formJson, accountEmail: accountEmail || null,
    });
    return Response.json({ received: true }, { status: 201, headers });
  } catch (error) {
    if (error instanceof MediaUploadRequestError) return failure("No se pudo leer la ficha. Envía únicamente los campos del formulario.", error.status);
    if (error instanceof ProfileValidationError) return failure(error.message, 400);
    console.error("Sample intake failed");
    return failure("No se pudo confirmar la recepción. Inténtalo nuevamente en unos minutos.", 500);
  }
}
