import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { profileCityAlerts, profiles, users } from "@/db/schema";
import { sendPortalEmail } from "@/lib/account-email";
import { profilePublicPath } from "@/lib/profile";
import { publicProfileCondition } from "@/lib/public-profile-visibility";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";

export async function getProfileAlertCities() {
  const rows = await (await getDb()).selectDistinct({ city: profiles.city })
    .from(profiles)
    .where(publicProfileCondition)
    .orderBy(asc(profiles.city));
  return rows.map((row) => row.city.trim()).filter(Boolean);
}

export async function getActiveProfileCityAlerts(profileId: string, userId?: string) {
  if (!userId) return [];
  const rows = await (await getDb()).select({ city: profileCityAlerts.city })
    .from(profileCityAlerts)
    .where(and(
      eq(profileCityAlerts.profileId, profileId),
      eq(profileCityAlerts.userId, userId),
      isNull(profileCityAlerts.notifiedAt),
    ))
    .orderBy(asc(profileCityAlerts.city));
  return rows.map((row) => row.city);
}

export async function notifyProfileCitySubscribers(profileId: string) {
  const db = await getDb();
  const [profile] = await db.select({
    id: profiles.id,
    displayName: profiles.displayName,
    slug: profiles.slug,
    handle: profiles.handle,
    city: profiles.city,
    status: profiles.status,
  }).from(profiles).where(eq(profiles.id, profileId)).limit(1);

  if (!profile || profile.status !== "approved") return 0;

  const subscribers = await db.select({
    alertId: profileCityAlerts.id,
    email: users.email,
    displayName: users.displayName,
  }).from(profileCityAlerts)
    .innerJoin(users, eq(users.id, profileCityAlerts.userId))
    .where(and(
      eq(profileCityAlerts.profileId, profile.id),
      eq(profileCityAlerts.city, profile.city),
      isNull(profileCityAlerts.notifiedAt),
      eq(users.isActive, true),
    ));

  if (!subscribers.length) return 0;
  const settings = await getSiteSettings();
  const href = new URL(profilePublicPath(profile), siteBaseUrl(settings.site_url)).toString();
  const notifiedAt = new Date().toISOString();
  let deliveredCount = 0;

  // A city change is rare. Small batches avoid turning a single approval into
  // an unbounded burst of outbound requests on the Worker.
  for (let start = 0; start < subscribers.length; start += 10) {
    const batch = subscribers.slice(start, start + 10);
    const results = await Promise.all(batch.map(async (subscriber) => {
      const delivered = await sendPortalEmail({
        email: subscriber.email,
        displayName: subscriber.displayName,
        subject: `${profile.displayName} llegó a ${profile.city} | Chile3X`,
        heading: `Ahora está en ${profile.city}`,
        message: `${profile.displayName} cambió su anuncio a ${profile.city}, la ciudad para la que pediste un aviso.`,
        action: { label: "Ver anuncio", href },
        note: "Este aviso se envía una sola vez. Tu correo nunca se muestra a la persona anunciante.",
      });
      if (delivered) {
        await db.update(profileCityAlerts).set({ notifiedAt }).where(eq(profileCityAlerts.id, subscriber.alertId));
      }
      return delivered;
    }));
    deliveredCount += results.filter(Boolean).length;
  }

  return deliveredCount;
}
