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
  serializeAvailability,
  slugify,
  spokenLanguages,
  citiesByRegion,
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
  contactWhatsapp: string | null;
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
  "arsmate_url",
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
  "travel_city",
  "travel_start",
  "travel_end",
  "travel_note",
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

function requiredUrl(value: string, fieldLabel: string, allowedHost?: string | string[]) {
  if (!value) return "";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ProfileValidationError(`${fieldLabel} debe incluir una URL válida.`);
  }
  const allowedHosts = allowedHost ? (Array.isArray(allowedHost) ? allowedHost : [allowedHost]) : [];
  if (!/^https?:$/.test(url.protocol) || (allowedHosts.length && !allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)))) {
    throw new ProfileValidationError(`${fieldLabel} debe usar un enlace válido de ${allowedHosts.join(" o ") || "un sitio web"}.`);
  }
  return url.toString();
}

function normalizeInstagram(value: string) {
  if (!value) return "";
  if (/^@?[A-Za-z0-9._]{1,30}$/.test(value)) {
    return `https://www.instagram.com/${value.replace(/^@/, "")}/`;
  }
  return requiredUrl(value, "Instagram", "instagram.com");
}

export function readProfileSubmission(formData: FormData): ProfileSubmission {
  const typeValue = compactText(formData.get("type"), 20);
  const tierValue = compactText(formData.get("tier"), 20);
  const region = compactText(formData.get("region"), 120);
  const city = compactText(formData.get("city"), 120);
  const displayName = required(compactText(formData.get("display_name"), 80), "Indica un nombre visible.");
  const shortDescription = required(compactText(formData.get("short_description"), 180), "Agrega una descripción breve.");
  const description = required(longText(formData.get("description"), 4000), "Agrega una descripción completa.");
  const contactWhatsapp = compactText(formData.get("contact_whatsapp"), 15);
  const intent = formData.get("intent") === "submit" ? "submit" : "draft";

  if (!isProfileType(typeValue) || !isTier(tierValue)) {
    throw new ProfileValidationError("El tipo de perfil o categoría no es válido.");
  }

  if (!isAllowedLocation(region, city)) {
    throw new ProfileValidationError("Selecciona una ciudad disponible para la región elegida.");
  }

  if (contactWhatsapp && !/^[0-9]{8,15}$/.test(contactWhatsapp)) {
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

  const priceValues = ["price_30_min", "price_60_min", "price_moment", "price_night"] as const;
  const prices = Object.fromEntries(priceValues.flatMap((field) => {
    const raw = compactText(formData.get(field), 14);
    const value = optionalPositiveInteger(formData.get(field));
    if (raw && (value === null || value === 0)) {
      throw new ProfileValidationError("Los valores deben ser números mayores que cero.");
    }
    return value ? [[field, String(value)]] : [];
  }));
  const generalPriceRaw = compactText(formData.get("price_amount"), 14);
  const generalPrice = optionalPositiveInteger(formData.get("price_amount"));
  if (generalPriceRaw && (generalPrice === null || generalPrice === 0)) {
    throw new ProfileValidationError("El valor debe ser un número mayor que cero.");
  }

  const telegram = compactText(formData.get("contact_telegram"), 80).replace(/^@/, "");
  if (telegram && !/^[A-Za-z0-9_]{5,32}$/.test(telegram)) {
    throw new ProfileValidationError("Telegram debe ser un nombre de usuario válido.");
  }

  const age = compactText(formData.get("age"), 2);
  if (age && (!/^[0-9]{2,3}$/.test(age) || Number(age) < 18)) {
    throw new ProfileValidationError("La edad debe ser de al menos 18 años.");
  }

  const website = requiredUrl(compactText(formData.get("website"), 180), "El sitio web");
  const facebookUrl = requiredUrl(compactText(formData.get("facebook_url"), 180), "Facebook", "facebook.com");
  const twitterUrl = requiredUrl(compactText(formData.get("twitter_url"), 180), "Twitter/X", ["x.com", "twitter.com"]);
  const instagramUrl = normalizeInstagram(compactText(formData.get("instagram_url"), 180));
  const arsmateUrl = requiredUrl(compactText(formData.get("arsmate_url"), 180), "Arsmate", "arsmate.com");
  const languages = listFromForm(formData.getAll("languages"), spokenLanguages).join(", ");
  const availability = serializeAvailability(formData);
  const travelCity = compactText(formData.get("travel_city"), 120);
  const travelStart = compactText(formData.get("travel_start"), 10);
  const travelEnd = compactText(formData.get("travel_end"), 10);
  const travelNote = compactText(formData.get("travel_note"), 180);
  const allowedTravelCities = new Set([...citiesByRegion.values()].flat());
  if ([travelCity, travelStart, travelEnd].some(Boolean) && !(travelCity && travelStart && travelEnd)) {
    throw new ProfileValidationError("Para publicar un viaje indica ciudad, fecha de inicio y fecha de término.");
  }
  if (travelCity && (!allowedTravelCities.has(travelCity) || !/^\d{4}-\d{2}-\d{2}$/.test(travelStart) || !/^\d{4}-\d{2}-\d{2}$/.test(travelEnd) || travelStart > travelEnd)) {
    throw new ProfileValidationError("La agenda de viaje no es válida.");
  }

  if (!contactWhatsapp) {
    throw new ProfileValidationError("Agrega al menos una forma de contacto o red social pública.");
  }

  const metadata = Object.fromEntries(
    metadataFields
      .map((field) => [field, compactText(formData.get(field), field === "promotions" ? 500 : 180)] as const)
      .filter(([, value]) => value),
  );

  if (typeValue === "escort") Object.assign(metadata, prices);
  if (languages) metadata.languages = languages;
  if (availability) metadata.availability = availability;
  if (website) metadata.website = website;
  if (facebookUrl) metadata.facebook_url = facebookUrl;
  if (twitterUrl) metadata.twitter_url = twitterUrl;
  if (instagramUrl) metadata.instagram_url = instagramUrl;
  if (arsmateUrl) metadata.arsmate_url = arsmateUrl;
  if (typeValue === "escort" && travelCity) {
    metadata.travel_city = travelCity;
    metadata.travel_start = travelStart;
    metadata.travel_end = travelEnd;
    if (travelNote) metadata.travel_note = travelNote;
  }

  const tags = typeValue === "escort" ? listFromForm(formData.getAll("tags"), profileTags) : [];
  if (tags.includes("milf") && tags.includes("trans")) {
    throw new ProfileValidationError("MILF y TRANS no se pueden combinar en un mismo perfil.");
  }

  return {
    type: typeValue,
    tier: typeValue === "escort" ? tierValue : "gold",
    displayName,
    region,
    city,
    comuna: optional(compactText(formData.get("comuna"), 80)),
    shortDescription,
    description,
    contactWhatsapp: optional(contactWhatsapp),
    contactTelegram: optional(telegram),
    details: {
      contactPhone: optional(contactPhone),
      contactEmail: optional(contactEmail),
      referenceLocation: optional(compactText(formData.get("reference_location"), 120)),
      schedule: null,
      priceAmount: typeValue === "escort" ? null : generalPrice,
      currency: formData.get("currency") === "USD" ? "USD" : "CLP",
      metadata: JSON.stringify(metadata),
    },
    tags,
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
