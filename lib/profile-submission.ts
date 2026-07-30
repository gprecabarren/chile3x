import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { listingPeriods, profileDetails, profileServices, profileTags as profileTagRows, profiles, users } from "@/db/schema";
import {
  additionalServices,
  compactText,
  includedServices,
  isAllowedLocation,
  isProfileType,
  isTier,
  listFromForm,
  longText,
  optionalPositiveInteger,
  profileTags,
  slugify,
  type ProfileType,
  type Tier,
} from "@/lib/profile";

export class ProfileValidationError extends Error {}

export type ProfileSubmission = {
  type: ProfileType;
  tier: Tier;
  displayName: string;
  region: string;
  city: string;
  comuna: string | null;
  shortDescription: string;
  description: string;
  contactWhatsapp: string;
  contactTelegram: string | null;
  details: {
    contactPhone: string | null;
    contactEmail: string | null;
    referenceLocation: string | null;
    schedule: string | null;
    priceAmount: number | null;
    currency: string;
    metadata: string;
  };
  tags: string[];
  servicesIncluded: string[];
  servicesAdditional: string[];
  intent: "draft" | "submit";
};

const metadataFields = [
  "artist_name",
  "gender",
  "age",
  "nationality",
  "skin_color",
  "languages",
  "height_cm",
  "weight_kg",
  "measurements",
  "hair_color",
  "body_type",
  "bust_size",
  "agency_years",
  "website",
  "facebook_url",
  "instagram_url",
  "twitter_url",
  "promotions",
  "contact_methods",
  "room_type",
  "furnished",
  "private_bathroom",
  "exterior_window",
  "room_size",
  "common_expenses",
  "deposit",
  "minimum_rental",
  "immediate_available",
  "wifi",
  "utilities_included",
  "kitchen",
  "laundry",
] as const;

function required(value: string, message: string) {
  if (!value) {
    throw new ProfileValidationError(message);
  }

  return value;
}

function optional(value: string) {
  return value || null;
}

export function readProfileSubmission(formData: FormData): ProfileSubmission {
  const typeValue = compactText(formData.get("type"), 20);
  const tierValue = compactText(formData.get("tier"), 20);
  const region = compactText(formData.get("region"), 120);
  const city = compactText(formData.get("city"), 120);
  const displayName = required(compactText(formData.get("display_name"), 80), "Indica un nombre visible.");
  const shortDescription = required(compactText(formData.get("short_description"), 180), "Agrega una descripción breve.");
  const description = required(longText(formData.get("description"), 4000), "Agrega una descripción completa.");
  const contactWhatsapp = required(compactText(formData.get("contact_whatsapp"), 15), "Indica un WhatsApp de contacto.");
  const intent = formData.get("intent") === "submit" ? "submit" : "draft";

  if (!isProfileType(typeValue) || !isTier(tierValue)) {
    throw new ProfileValidationError("El tipo de perfil o categoría no es válido.");
  }

  if (!isAllowedLocation(region, city)) {
    throw new ProfileValidationError("Selecciona una ciudad disponible para la región elegida.");
  }

  if (!/^[0-9]{8,15}$/.test(contactWhatsapp)) {
    throw new ProfileValidationError("El WhatsApp debe incluir solo números, sin signo +.");
  }

  const contactPhone = compactText(formData.get("contact_phone"), 15);
  if (contactPhone && !/^[0-9]{8,15}$/.test(contactPhone)) {
    throw new ProfileValidationError("El teléfono alternativo debe incluir solo números.");
  }

  const contactEmail = compactText(formData.get("contact_email"), 160).toLowerCase();
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new ProfileValidationError("El correo de contacto no es válido.");
  }

  const priceRaw = compactText(formData.get("price_amount"), 14);
  const priceAmount = optionalPositiveInteger(formData.get("price_amount"));
  if (priceRaw && priceAmount === null) {
    throw new ProfileValidationError("El precio debe ser un número válido.");
  }

  const age = compactText(formData.get("age"), 2);
  if (age && (!/^[0-9]{2,3}$/.test(age) || Number(age) < 18)) {
    throw new ProfileValidationError("La edad debe ser de al menos 18 años.");
  }

  for (const field of ["website", "facebook_url", "instagram_url", "twitter_url"] as const) {
    const url = compactText(formData.get(field), 180);
    if (url) {
      try {
        new URL(url);
      } catch {
        throw new ProfileValidationError("Los enlaces web deben incluir una URL válida.");
      }
    }
  }

  const metadata = Object.fromEntries(
    metadataFields
      .map((field) => [field, compactText(formData.get(field), field === "promotions" ? 500 : 180)] as const)
      .filter(([, value]) => value),
  );

  return {
    type: typeValue,
    tier: tierValue,
    displayName,
    region,
    city,
    comuna: optional(compactText(formData.get("comuna"), 80)),
    shortDescription,
    description,
    contactWhatsapp,
    contactTelegram: optional(compactText(formData.get("contact_telegram"), 80)),
    details: {
      contactPhone: optional(contactPhone),
      contactEmail: optional(contactEmail),
      referenceLocation: optional(compactText(formData.get("reference_location"), 120)),
      schedule: optional(compactText(formData.get("schedule"), 120)),
      priceAmount,
      currency: formData.get("currency") === "USD" ? "USD" : "CLP",
      metadata: JSON.stringify(metadata),
    },
    tags: listFromForm(formData.getAll("tags"), profileTags),
    servicesIncluded: listFromForm(formData.getAll("services_included"), includedServices),
    servicesAdditional: listFromForm(formData.getAll("services_additional"), additionalServices),
    intent,
  };
}

async function replaceProfileCollections(profileId: string, submission: ProfileSubmission) {
  const db = await getDb();
  await db.delete(profileTagRows).where(eq(profileTagRows.profileId, profileId));
  await db.delete(profileServices).where(eq(profileServices.profileId, profileId));

  if (submission.tags.length) {
    await db.insert(profileTagRows).values(submission.tags.map((tag) => ({
      id: `tag_${crypto.randomUUID()}`,
      profileId,
      tag,
    })));
  }

  const services = [
    ...submission.servicesIncluded.map((service) => ({ id: `srv_${crypto.randomUUID()}`, profileId, service, kind: "included" as const })),
    ...submission.servicesAdditional.map((service) => ({ id: `srv_${crypto.randomUUID()}`, profileId, service, kind: "additional" as const })),
  ];

  if (services.length) {
    await db.insert(profileServices).values(services);
  }
}

export async function createProfile(ownerId: string, submission: ProfileSubmission) {
  const db = await getDb();
  const id = `prf_${crypto.randomUUID()}`;
  const now = new Date();
  const status = submission.intent === "submit" ? "pending" : "draft";
  const updatedAt = now.toISOString();
  const slug = [slugify(submission.displayName), slugify(submission.city), crypto.randomUUID().slice(0, 8)].join("-");

  await db.insert(profiles).values({
    id,
    ownerId,
    type: submission.type,
    status,
    slug,
    displayName: submission.displayName,
    shortDescription: submission.shortDescription,
    description: submission.description,
    region: submission.region,
    city: submission.city,
    comuna: submission.comuna,
    contactWhatsapp: submission.contactWhatsapp,
    contactTelegram: submission.contactTelegram,
    tier: submission.tier,
    verificationStatus: submission.intent === "submit" ? "in_review" : "unreviewed",
    updatedAt,
  });

  await db.insert(profileDetails).values({ profileId: id, ...submission.details, updatedAt });
  await replaceProfileCollections(id, submission);
  await db.insert(listingPeriods).values({
    id: `per_${crypto.randomUUID()}`,
    profileId: id,
    planName: "Cortesía inicial",
    startsAt: updatedAt,
    endsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
  });
  await db.update(users).set({ role: "advertiser" }).where(and(eq(users.id, ownerId), eq(users.role, "visitor")));

  return id;
}

export async function updateProfile(profileId: string, ownerId: string, submission: ProfileSubmission) {
  const db = await getDb();
  const [existing] = await db.select({ id: profiles.id, status: profiles.status }).from(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.ownerId, ownerId))).limit(1);

  if (!existing) {
    return false;
  }

  const updatedAt = new Date().toISOString();
  const status = existing.status === "paused" ? "paused" : submission.intent === "submit" || existing.status === "approved" ? "pending" : existing.status;

  await db.update(profiles).set({
    type: submission.type,
    status,
    displayName: submission.displayName,
    shortDescription: submission.shortDescription,
    description: submission.description,
    region: submission.region,
    city: submission.city,
    comuna: submission.comuna,
    contactWhatsapp: submission.contactWhatsapp,
    contactTelegram: submission.contactTelegram,
    tier: submission.tier,
    verificationStatus: status === "pending" ? "in_review" : "unreviewed",
    updatedAt,
  }).where(eq(profiles.id, profileId));

  await db.insert(profileDetails).values({ profileId, ...submission.details, updatedAt }).onConflictDoUpdate({
    target: profileDetails.profileId,
    set: { ...submission.details, updatedAt },
  });
  await replaceProfileCollections(profileId, submission);
  return true;
}
