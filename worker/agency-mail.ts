import { sendPortalEmail } from "../lib/account-email";

/** Durable bounded jobs; panel state never depends on an email provider.
 * An atomic claim prevents overlapping sends. A crash remains flagged for review,
 * rather than retrying an email whose provider acknowledgement is unknown. */
export async function handleAgencyMailScheduled(env: Pick<Env, "DB">) {
  const now = Date.now(),
    rows = await env.DB.prepare(
      "SELECT id FROM agency_email_jobs WHERE status='pending' AND next_attempt_at<=? ORDER BY created_at,id LIMIT 5",
    )
      .bind(now)
      .all<{ id: string }>();
  for (const row of rows.results) {
    const job = await env.DB.prepare(
      "UPDATE agency_email_jobs SET status='failed',attempts=attempts+1,next_attempt_at=? WHERE id=? AND status='pending' AND next_attempt_at<=? RETURNING *",
    )
      .bind(now + 20 * 60_000, row.id, now)
      .first<{
        id: string;
        recipient_id: string;
        agency_profile_id: string;
        escort_profile_id: string;
        kind: string;
        attempts: number;
      }>();
    if (!job) continue;
    if (job.kind === "invitation" || job.kind === "claim") {
      const current =
        job.kind === "invitation"
          ? await env.DB.prepare(
              "SELECT 1 valid FROM agency_membership_requests WHERE agency_profile_id=? AND escort_profile_id=? AND status='pending' AND coalesce(expires_at,cast(strftime('%s',created_at) AS INTEGER)*1000+604800000)>? AND id||':'||expires_at||':invite'=?",
            )
              .bind(job.agency_profile_id, job.escort_profile_id, now, job.id)
              .first()
          : await env.DB.prepare(
              "SELECT 1 valid FROM agency_profile_claims WHERE id||':claim'=? AND status IN('pending','accepted') AND expires_at>?",
            )
              .bind(job.id, now)
              .first();
      if (!current) {
        await env.DB.prepare(
          "UPDATE agency_email_jobs SET status='failed' WHERE id=?",
        )
          .bind(job.id)
          .run();
        continue;
      }
    }
    const target = await env.DB.prepare(
      "SELECT u.email,u.display_name,u.is_active,a.display_name agency_name,p.display_name profile_name FROM users u LEFT JOIN profiles a ON a.id=? LEFT JOIN profiles p ON p.id=? WHERE u.id=?",
    )
      .bind(job.agency_profile_id, job.escort_profile_id, job.recipient_id)
      .first<{
        email: string;
        display_name: string | null;
        is_active: number;
        agency_name: string | null;
        profile_name: string | null;
      }>();
    if (!target?.is_active) {
      await env.DB.prepare(
        "UPDATE agency_email_jobs SET status='failed' WHERE id=?",
      )
        .bind(job.id)
        .run();
      continue;
    }
    const heading =
      job.kind === "invitation"
        ? "Invitación de agencia"
        : job.kind === "claim"
          ? "Propuesta para vincular un anuncio a tu cuenta"
          : job.kind === "completed"
            ? "Vinculación de anuncio completada"
            : job.kind === "revoked"
              ? "Cambió una asociación o sus permisos"
              : "Respuesta a una invitación de agencia";
    try {
      const accepted = await sendPortalEmail({
        email: target.email,
        displayName: target.display_name,
        subject: `${heading} · Chile3X`,
        heading,
        message: `${target.agency_name ?? "Una agencia"} · ${target.profile_name ?? "Anuncio"}. Revisa el estado y las autorizaciones desde tu panel de Chile3X. Un correo no acepta invitaciones ni cambia la titularidad por sí solo.`,
        action: {
          label: "Revisar en Mi cuenta",
          href: "https://chile3x.cl/mi-cuenta#agencias",
        },
        note: "El panel conserva el estado vigente aunque no recibas este aviso. No incluye documentos privados ni credenciales.",
        kind: "portal_notification",
      });
      if (accepted)
        await env.DB.prepare(
          "UPDATE agency_email_jobs SET status='accepted' WHERE id=?",
        )
          .bind(job.id)
          .run();
      else {
        // Only retry a known non-attempt (paused/unconfigured). Ambiguous provider
        // acknowledgement must be inspected rather than automatically duplicated.
        const log = await env.DB.prepare(
          "SELECT attempts FROM email_delivery_logs WHERE recipient=? AND subject=? ORDER BY created_at DESC,id DESC LIMIT 1",
        )
          .bind(target.email, `${heading} · Chile3X`)
          .first<{ attempts: string | null }>();
        let attempted = true;
        try {
          if (log) attempted = JSON.parse(log.attempts ?? "[]").length > 0;
        } catch {
          /* Fail closed on uncertainty. */
        }
        await env.DB.prepare(
          "UPDATE agency_email_jobs SET status=?,next_attempt_at=? WHERE id=?",
        )
          .bind(
            !attempted && job.attempts < 5 ? "pending" : "failed",
            Date.now() + job.attempts * 15 * 60_000,
            job.id,
          )
          .run();
      }
    } catch {
      await env.DB.prepare(
        "UPDATE agency_email_jobs SET status='failed' WHERE id=?",
      )
        .bind(job.id)
        .run();
      console.error(
        "Agency email job needs review; panel invitation remains available.",
      );
    }
  }
  await env.DB.prepare(
    "DELETE FROM agency_email_jobs WHERE status!='pending' AND datetime(created_at)<datetime('now','-90 days')",
  ).run();
  await env.DB.prepare(
    "DELETE FROM agency_activity_logs WHERE datetime(created_at)<datetime('now','-180 days')",
  ).run();
}
