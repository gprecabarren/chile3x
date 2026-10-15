import { sendPortalEmail } from "../lib/account-email";
import type { ForwardableEmailMessage } from "@cloudflare/workers-types";

export async function handleModerationMailScheduled(env: Pick<Env, "DB">) {
  const rows = await env.DB.prepare("SELECT key,value FROM site_settings WHERE key LIKE 'mail_%' OR key='site_url'").all<{key:string;value:string}>();
  const settings = Object.fromEntries(rows.results.map(row => [row.key, row.value]));
  if (settings.mail_alerts_enabled !== "enabled") {
    await env.DB.prepare("UPDATE moderation_email_jobs SET state='skipped',finished_at=CURRENT_TIMESTAMP WHERE state='pending'").run();
    return;
  }
  const jobs = await env.DB.prepare("SELECT id,profile_id,kind FROM moderation_email_jobs WHERE state='pending' ORDER BY created_at,id LIMIT 5").all<{id:string;profile_id:string;kind:string}>();
  for (const job of jobs.results) {
    const claimed = await env.DB.prepare("UPDATE moderation_email_jobs SET state='sending' WHERE id=? AND state='pending' RETURNING id").bind(job.id).first();
    if (!claimed) continue;
    try {
      const profile = await env.DB.prepare("SELECT display_name,status,trashed_at,((SELECT count(*) FROM profile_media WHERE profile_id=profiles.id AND moderation_status='pending')+(SELECT count(*) FROM exclusive_content_media m JOIN exclusive_content_collections c ON c.id=m.collection_id WHERE c.profile_id=profiles.id AND m.moderation_status='pending')) pending_media FROM profiles WHERE id=?").bind(job.profile_id).first<{display_name:string;status:string;trashed_at:string|null;pending_media:number}>();
      const flag = job.kind === "profile_created" ? "mail_alert_new_profile" : job.kind === "media_uploaded" ? "mail_alert_media" : "mail_alert_updated_profile";
      if (!profile || profile.trashed_at || settings[flag] === "disabled" || (job.kind === "media_uploaded" ? !profile.pending_media : profile.status !== "pending")) {
        await env.DB.prepare("UPDATE moderation_email_jobs SET state='skipped',finished_at=CURRENT_TIMESTAMP WHERE id=?").bind(job.id).run();
        continue;
      }
      const title = job.kind === "profile_created" ? "Nuevo anuncio por revisar" : job.kind === "media_uploaded" ? "Fotos o videos por revisar" : "Anuncio editado por revisar";
      const accepted = await sendPortalEmail({ email: settings.mail_alert_recipient || "chile3x.site@gmail.com", subject: `${title} · Chile3X`, heading: title, message: `${profile.display_name}: ${job.kind === "media_uploaded" ? `${profile.pending_media} archivos pendientes de moderación` : "el anuncio está pendiente de aprobación"}. Revisa los datos desde el panel antes de publicar.`, action: { label: "Abrir revisión del anuncio", href: `https://chile3x.cl/admin/anuncios-publicaciones?q=${encodeURIComponent(job.profile_id)}` }, note: "Aviso automático del equipo. No incluye documentos ni archivos privados. La notificación no aprueba el anuncio.", kind: "moderation_alert" });
      await env.DB.prepare("UPDATE moderation_email_jobs SET state=?,finished_at=CURRENT_TIMESTAMP WHERE id=?").bind(accepted ? "accepted" : "failed", job.id).run();
    } catch {
      // Do not retry an ambiguous provider acknowledgement automatically and
      // risk duplicate mail. The delivery history keeps the technical result.
      await env.DB.prepare("UPDATE moderation_email_jobs SET state='failed',finished_at=CURRENT_TIMESTAMP WHERE id=?").bind(job.id).run();
      console.error("Moderation email job failed; inspect email delivery history.");
    }
  }
  await env.DB.prepare("DELETE FROM moderation_email_jobs WHERE state<>'pending' AND datetime(created_at)<datetime('now','-90 days')").run();
}

export async function forwardConfiguredInbound(message: ForwardableEmailMessage, env: Pick<Env,"DB">) {
  const rows = await env.DB.prepare("SELECT key,value FROM site_settings WHERE key IN ('mail_inbound_mode','mail_inbound_address','mail_inbound_destination')").all<{key:string;value:string}>();
  const settings = Object.fromEntries(rows.results.map(row=>[row.key,row.value]));
  const destination = settings.mail_inbound_destination?.toLowerCase();
  if (settings.mail_inbound_mode !== "forward" || message.to.toLowerCase() !== settings.mail_inbound_address?.toLowerCase() || !destination || destination === message.to.toLowerCase() || destination === message.from.toLowerCase()) {
    message.setReject("Esta dirección no admite recepción mediante el portal.");
    return;
  }
  // Cloudflare requires a verified destination. Store no MIME or attachments.
  await message.forward(destination);
}
