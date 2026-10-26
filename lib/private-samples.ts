import { and, asc, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { adminAuditLogs, collaborationGuards, listingPeriods, privateProfileSamples, privateSampleMedia, profileDetails, profileMedia, profileServices, profileTags, profiles, users } from "@/db/schema";
import { adminHasCapability } from "./admin-permissions";
import type { AdminUser } from "./auth";
import { guardedBatch, type ReviewVersion, CollaborationConflict } from "./collaboration";
import { readProfileSubmission, resolveProfileHandle, ProfileValidationError, validateProfileTravelDates } from "./profile-submission";
import { sampleCanEdit, sampleForm, sampleFormJson, sampleIsAvailable, sampleTokenHash, readSampleProvenance, SAMPLE_ID, SAMPLE_HANDLE, SAMPLE_LIFETIME_MS, PRIVATE_SAMPLES_ENABLED } from "./private-sample-policy";
import { hasUnlimitedEscortListings } from "./profile-limits";
import { citiesByRegion, escortGenders, slugify } from "./profile";
import { boundedSampleFilter, samplePhoneSearchTerms } from "./private-sample-filters";
import type { PublicProfile } from "./directory";

export { sampleCanEdit } from "./private-sample-policy";
export type PrivateSample = typeof privateProfileSamples.$inferSelect;
export type SampleFilters = { q?: string; provenance?: string; status?: string; view?: "active" | "trash"; contact?: "all" | "pending" | "contacted"; region?: string; city?: string; phone?: string; gender?: string };

/** Entries are [field,value] pairs, not a JSON object. Guard the document and
 * each entry before extracting paths, including malformed historical data. */
function sampleEntryMatches(fields: readonly string[], predicate: (value: SQL) => SQL) {
  const document = sql`case when json_valid(${privateProfileSamples.formJson}) then case when json_type(${privateProfileSamples.formJson})='array' then ${privateProfileSamples.formJson} else '[]' end else '[]' end`;
  const pair = sql`case when sample_field.type='array' then sample_field.value else '[]' end`;
  const key = sql`json_extract(${pair},'$[0]')`, value = sql`json_extract(${pair},'$[1]')`;
  return sql`exists(select 1 from json_each(${document}) as sample_field where json_array_length(${pair})=2 and json_type(${pair},'$[0]')='text' and json_type(${pair},'$[1]')='text' and ${key} in (${sql.join(fields.map(field => sql`${field}`), sql`,`)}) and ${predicate(value)})`;
}
function samplePhoneMatches(terms: string[]) {
  return sampleEntryMatches(["contact_whatsapp", "contact_phone"], value => {
    let digits = value;
    for (const separator of ["+", " ", "(", ")", "-", ".", "\t", "\r", "\n", "\u00a0", "\u202f"]) digits = sql`replace(${digits},${separator},'')`;
    return sql`(${sql.join(terms.map(term => sql`instr(${digits},${term})>0`), sql` or `)})`;
  });
}

export function canManageSamples(admin: AdminUser | null) {
  return PRIVATE_SAMPLES_ENABLED && adminHasCapability(admin, "accounts.manage") && adminHasCapability(admin, "profiles.moderate");
}
export async function getPrivateSample(id: string) {
  if (!PRIVATE_SAMPLES_ENABLED || !SAMPLE_ID.test(id)) return null;
  return (await (await getDb()).select().from(privateProfileSamples).where(eq(privateProfileSamples.id, id)).limit(1))[0] ?? null;
}
/** ID aliases and their path-scoped cookies remain valid alongside short handles. */
export async function resolvePrivateSample(identifier: string) {
  if (SAMPLE_ID.test(identifier)) return getPrivateSample(identifier);
  if (!PRIVATE_SAMPLES_ENABLED || !SAMPLE_HANDLE.test(identifier)) return null;
  return (await (await getDb()).select().from(privateProfileSamples).where(eq(privateProfileSamples.handle, identifier)).limit(1))[0] ?? null;
}
export async function listPrivateSamples(filters: SampleFilters = {}) {
  const now = Date.now();
  const status = sql<string>`case when ${privateProfileSamples.trashedAt} is not null then 'trashed' when ${privateProfileSamples.migratedAt} is not null then 'migrated' when ${privateProfileSamples.expiresAt}<=${now} then 'trashed' when ${privateProfileSamples.tokenHash} is not null or ${privateProfileSamples.legacyTokenHash} is not null then 'active' else 'unshared' end`;
  const clauses = [filters.view === "trash" ? sql`${status}='trashed'` : sql`${status}!='trashed'`];
  const q = boundedSampleFilter(filters.q, 100).replace(/^@/, "");
  if (q) {
    // Wildcards are literal, so searching '%' cannot match every sample.
    const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const phoneTerms = samplePhoneSearchTerms(q);
    clauses.push(or(sql`${privateProfileSamples.displayName} like ${pattern} escape '\\'`, sql`${privateProfileSamples.handle} like ${pattern} escape '\\'`, phoneTerms.length ? samplePhoneMatches(phoneTerms) : undefined)!);
  }
  const region = boundedSampleFilter(filters.region), city = boundedSampleFilter(filters.city), gender = boundedSampleFilter(filters.gender, 30);
  if (region) clauses.push(citiesByRegion.has(region) ? sampleEntryMatches(["region"], value => sql`${value}=${region}`) : sql`0`);
  if (city) {
    const allowedCities = region ? citiesByRegion.get(region) ?? [] : [...citiesByRegion.values()].flat();
    clauses.push(allowedCities.includes(city) ? sampleEntryMatches(["city"], value => sql`${value}=${city}`) : sql`0`);
  }
  if (gender) clauses.push(escortGenders.some(value => value === gender) ? sampleEntryMatches(["gender"], value => sql`${value}=${gender}`) : sql`0`);
  const phone = boundedSampleFilter(filters.phone, 80);
  if (phone) {
    const terms = samplePhoneSearchTerms(phone);
    clauses.push(terms.length ? samplePhoneMatches(terms) : sql`0`);
  }
  const provenance = readSampleProvenance(filters.provenance);
  if (provenance) clauses.push(eq(privateProfileSamples.provenance, provenance));
  if (["active", "unshared", "migrated", "trashed"].includes(filters.status ?? "")) clauses.push(sql`${status}=${filters.status}`);
  if (filters.contact === "pending") clauses.push(isNull(privateProfileSamples.contactedAt));
  if (filters.contact === "contacted") clauses.push(sql`${privateProfileSamples.contactedAt} is not null`);
  const rows = await (await getDb()).select({
    id: privateProfileSamples.id, displayName: privateProfileSamples.displayName, handle: privateProfileSamples.handle,
    provenance: privateProfileSamples.provenance, formJson: privateProfileSamples.formJson,
    revision: privateProfileSamples.revision, expiresAt: privateProfileSamples.expiresAt,
    migratedAt: privateProfileSamples.migratedAt, migratedProfileId: privateProfileSamples.migratedProfileId,
    trashedAt: privateProfileSamples.trashedAt, trashReason: privateProfileSamples.trashReason,
    createdAt: privateProfileSamples.createdAt, updatedAt: privateProfileSamples.updatedAt,
    contactedAt: privateProfileSamples.contactedAt, contactedBy: privateProfileSamples.contactedBy, contactedByLogin: privateProfileSamples.contactedByLogin,
    shared: sql<boolean>`${privateProfileSamples.tokenHash} is not null or ${privateProfileSamples.legacyTokenHash} is not null`,
    legacyLink: sql<boolean>`${privateProfileSamples.tokenHash} is not null and ${privateProfileSamples.tokenEncrypted} is null`,
  }).from(privateProfileSamples).where(and(...clauses))
    .orderBy(sql`case when ${privateProfileSamples.contactedAt} is null then 0 else 1 end`, desc(privateProfileSamples.updatedAt), asc(privateProfileSamples.id)).limit(100);
  return rows.map(({ formJson, ...row }) => {
    // A converted legacy row that cleared its form cannot break the list.
    let form: FormData;
    try { form = sampleForm(formJson); } catch { form = new FormData(); }
    const age = Number(form.get("age"));
    return { ...row, age: Number.isInteger(age) && age >= 18 && age <= 99 ? age : null, gender: String(form.get("gender") ?? ""), city: String(form.get("city") ?? ""), contactWhatsapp: String(form.get("contact_whatsapp") ?? "") };
  });
}
export async function sampleMedia(id: string) {
  return (await getDb()).select().from(privateSampleMedia).where(eq(privateSampleMedia.sampleId, id)).orderBy(asc(privateSampleMedia.sortOrder), asc(privateSampleMedia.id));
}
async function constantTimeHashMatch(stored: string | null, candidate: string) {
  if (!stored) return false;
  const bytes = new TextEncoder(), payload = bytes.encode("sample-access");
  const key = await crypto.subtle.importKey("raw", bytes.encode(stored), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, payload);
  const candidateKey = await crypto.subtle.importKey("raw", bytes.encode(candidate), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", candidateKey, signature, payload);
}
export async function canOpenSample(identifier: string, token: string | undefined) {
  if (!token) return null;
  const hash = await sampleTokenHash(token);
  if (!hash) return null;
  const row = await resolvePrivateSample(identifier);
  if (!row || !sampleIsAvailable(row)) return null;
  const matches = await Promise.all([constantTimeHashMatch(row.tokenHash, hash), constantTimeHashMatch(row.legacyTokenHash, hash)]);
  return matches.some(Boolean) ? row : null;
}
export function sampleSubmission(row: { formJson: string }) {
  return readProfileSubmission(sampleForm(row.formJson), { travelDateValidation: "stored" });
}
export function sampleInitial(row: { formJson: string }) {
  const s = sampleSubmission(row);
  return { ...s, comuna: s.comuna ?? "", contactWhatsapp: s.contactWhatsapp ?? "", contactTelegram: s.contactTelegram ?? "", details: { ...s.details, contactPhone: s.details.contactPhone ?? "", contactEmail: s.details.contactEmail ?? "", referenceLocation: s.details.referenceLocation ?? "", schedule: s.details.schedule ?? "", metadata: JSON.parse(s.details.metadata) as Record<string, string> } };
}
async function newSampleHandle(requested: string | null, displayName: string) {
  const db = await getDb();
  const available = async (handle: string) => !(await db.select({ id: privateProfileSamples.id }).from(privateProfileSamples).where(eq(privateProfileSamples.handle, handle)).limit(1)).length;
  if (requested && SAMPLE_HANDLE.test(requested) && await available(requested)) return requested;
  const base = slugify(displayName).slice(0, 30).replace(/[-_]+$/, "") || "muestra";
  for (let attempt = 0; attempt < 5; attempt++) {
    const handle = `${base}-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
    if (await available(handle)) return handle;
  }
  throw new ProfileValidationError("No se pudo reservar el usuario de la muestra. Inténtalo otra vez.");
}
export async function createPrivateSample(form: FormData, admin: AdminUser) {
  if (form.get("sample_permission") !== "on") throw new ProfileValidationError("Confirma que tienes autorización para preparar esta muestra y usar sus fotos.");
  const provenance = readSampleProvenance(form.get("sample_provenance") ?? "otros");
  if (!provenance) throw new ProfileValidationError("Selecciona una procedencia válida para la muestra.");
  const formJson = sampleFormJson(form), s = readProfileSubmission(sampleForm(formJson));
  const id = `sam_${crypto.randomUUID()}`, handle = await newSampleHandle(s.handle, s.displayName);
  const db = await getDb();
  await db.batch([
    db.insert(privateProfileSamples).values({ id, handle, provenance, displayName: s.displayName, formJson, createdBy: admin.id, expiresAt: Date.now() + SAMPLE_LIFETIME_MS }),
    db.insert(adminAuditLogs).values({ id: `audit_${crypto.randomUUID()}`, actorUserId: admin.id, actorGithubLogin: admin.githubLogin, actorEmail: admin.email, actorName: admin.displayName, category: "profiles", action: "sample.create", entityType: "sample", entityId: id, entityLabel: s.displayName, summary: "Creó una muestra privada.", afterData: JSON.stringify({ handle, provenance }) }),
  ]);
  return id;
}
export async function updatePrivateSample(id: string, form: FormData, version: ReviewVersion, admin: AdminUser) {
  if (version.key !== `sample:${id}`) throw new CollaborationConflict();
  const existing = await getPrivateSample(id);
  if (!existing || !sampleCanEdit(existing)) throw new CollaborationConflict();
  const provenance = readSampleProvenance(form.get("sample_provenance") ?? existing.provenance);
  if (!provenance) throw new ProfileValidationError("Selecciona una procedencia válida para la muestra.");
  const formJson = sampleFormJson(form), s = readProfileSubmission(sampleForm(formJson), { travelDateValidation: "stored" });
  validateProfileTravelDates(s, sampleSubmission(existing).details.metadata);
  const db = await getDb(), guard = crypto.randomUUID();
  await guardedBatch(version, [
    db.insert(collaborationGuards).values({ id: guard, allowed: sql`case when exists(select 1 from private_profile_samples where id=${id} and migrated_at is null and trashed_at is null and expires_at>${Date.now()}) then 1 else 0 end` }),
    db.update(privateProfileSamples).set({ displayName: s.displayName, formJson, provenance, updatedAt: new Date().toISOString() }).where(eq(privateProfileSamples.id, id)),
    db.insert(adminAuditLogs).values({ id: `audit_${crypto.randomUUID()}`, actorUserId: admin.id, actorGithubLogin: admin.githubLogin, actorEmail: admin.email, actorName: admin.displayName, category: "profiles", action: "sample.save", entityType: "sample", entityId: id, entityLabel: s.displayName, summary: "Editó los datos y la procedencia de una muestra privada.", beforeData: JSON.stringify({ displayName: existing.displayName, provenance: existing.provenance }), afterData: JSON.stringify({ displayName: s.displayName, provenance }) }),
    db.delete(collaborationGuards).where(eq(collaborationGuards.id, guard)),
  ], admin.id);
}
export async function privateSampleView(row: PrivateSample, identifier = row.handle ?? row.id): Promise<PublicProfile> {
  const s = sampleSubmission(row), files = await sampleMedia(row.id);
  return { id: row.id, slug: identifier, handle: row.handle, type: "escort", status: "draft", isPublic: false, displayName: s.displayName, shortDescription: s.shortDescription, description: s.description, region: s.region, city: s.city, comuna: s.comuna, contactWhatsapp: s.contactWhatsapp, contactTelegram: s.contactTelegram, tier: s.tier, verificationStatus: "unreviewed", verifiedAt: null, healthReviewStatus: "not_requested", isFeatured: false, isDemo: false, isOnline: false, updatedAt: row.updatedAt, details: { ...s.details, metadata: JSON.parse(s.details.metadata) }, tags: s.tags, servicesIncluded: s.servicesIncluded, servicesAdditional: s.servicesAdditional, media: files.map(file => ({ id: file.id, url: `/muestra/${identifier}/archivo/${file.id}`, altText: `Foto de ${s.displayName}`, mediaType: file.mediaType, contentType: file.contentType, isProfilePhoto: file.isProfilePhoto })), agencyIds: [], memberIds: [] };
}

export type SampleMigrationTarget = { ownerId: string; email: string; displayName: string | null; revision: number; escortCount: number; requiresAdditionalEscortConfirmation: boolean };
export class SampleEscortLimitConflict extends ProfileValidationError {
  readonly target: SampleMigrationTarget;
  constructor(target: SampleMigrationTarget) {
    super("Esta cuenta ya tiene un anuncio Escort. Confirma expresamente si deseas agregarle otro desde administración.");
    this.target = target;
  }
}
async function migrationOwner(email: string) {
  const db = await getDb();
  const owner = (await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1))[0];
  if (!owner || owner.role === "admin" || !owner.isActive || owner.selfDisabledAt || owner.adminDisabledAt) throw new ProfileValidationError("Selecciona el correo de una cuenta de anunciante activa. Puedes crearla desde Cuentas y volver aquí.");
  if (!owner.emailVerifiedAt && !owner.emailVerificationExemptAt) throw new ProfileValidationError("La cuenta debe verificar su correo antes de publicar la muestra.");
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(profiles).where(and(eq(profiles.ownerId, owner.id), eq(profiles.type, "escort"), isNull(profiles.trashedAt)));
  const target: SampleMigrationTarget = { ownerId: owner.id, email: owner.email, displayName: owner.displayName, revision: owner.revision, escortCount: Number(count), requiresAdditionalEscortConfirmation: Number(count) > 0 && !hasUnlimitedEscortListings(owner) };
  return { owner, target };
}
export async function getSampleMigrationTarget(email: string) { return (await migrationOwner(email)).target; }
export async function migratePrivateSample(row: PrivateSample, email: string, version: ReviewVersion, admin: AdminUser, options: { allowAdditionalEscort?: boolean; expectedOwnerId?: string; expectedOwnerRevision?: number; expectedEscortCount?: number } = {}) {
  if (!canManageSamples(admin) || version.key !== `sample:${row.id}` || !sampleCanEdit(row)) throw new CollaborationConflict();
  const latest = await getPrivateSample(row.id);
  if (!latest || !sampleCanEdit(latest) || latest.revision !== version.revision || row.revision !== version.revision) throw new CollaborationConflict();
  const db = await getDb(), { owner, target } = await migrationOwner(email);
  const override = target.requiresAdditionalEscortConfirmation;
  if (override && !options.allowAdditionalEscort) throw new SampleEscortLimitConflict(target);
  if (override && (options.expectedOwnerId !== owner.id || options.expectedOwnerRevision !== owner.revision || options.expectedEscortCount !== target.escortCount)) throw new CollaborationConflict();
  const s = readProfileSubmission(sampleForm(row.formJson)), files = await sampleMedia(row.id);
  if (!files.some(file => file.mediaType === "image")) throw new ProfileValidationError("Sube al menos una foto antes de publicar.");
  const handle = await resolveProfileHandle(s.handle ?? row.handle, s.displayName), id = `prf_${crypto.randomUUID()}`, now = new Date().toISOString(), guard = crypto.randomUUID();
  const tags = s.tags.map(tag => ({ id: `tag_${crypto.randomUUID()}`, profileId: id, tag }));
  const services = [...s.servicesIncluded.map(service => ({ id: `srv_${crypto.randomUUID()}`, profileId: id, service, kind: "included" as const })), ...s.servicesAdditional.map(service => ({ id: `srv_${crypto.randomUUID()}`, profileId: id, service, kind: "additional" as const }))];
  validateProfileTravelDates(s);
  // Target state/count, sample lifecycle/revision, transfer and audit commit
  // together; an old confirmation cannot authorize a changed account.
  await guardedBatch(version, [
    db.insert(collaborationGuards).values({ id: guard, allowed: sql`case when exists(select 1 from users where id=${owner.id} and revision=${owner.revision} and is_active=1 and role!='admin' and self_disabled_at is null and admin_disabled_at is null and (email_verified_at is not null or email_verification_exempt_at is not null)) and (select count(*) from profiles where owner_id=${owner.id} and type='escort' and trashed_at is null)=${target.escortCount} and exists(select 1 from private_profile_samples where id=${row.id} and migrated_at is null and trashed_at is null and expires_at>${Date.now()}) then 1 else 0 end` }),
    db.insert(profiles).values({ id, ownerId: owner.id, type: "escort", status: "approved", slug: `${slugify(s.displayName)}-${crypto.randomUUID().slice(0, 8)}`, handle, displayName: s.displayName, shortDescription: s.shortDescription, description: s.description, region: s.region, city: s.city, comuna: s.comuna, contactWhatsapp: s.contactWhatsapp, contactTelegram: s.contactTelegram, tier: s.tier, creationSource: "admin", createdByAdminId: admin.id, createdByAdminLogin: admin.githubLogin, adminEscortLimitOverride: override, verificationStatus: "unreviewed", updatedAt: now }),
    db.insert(profileDetails).values({ profileId: id, ...s.details, updatedAt: now }),
    ...(tags.length ? [db.insert(profileTags).values(tags)] : []),
    ...(services.length ? [db.insert(profileServices).values(services)] : []),
    db.insert(profileMedia).values(files.map(file => ({ id: `med_${crypto.randomUUID()}`, profileId: id, r2Key: file.r2Key, byteSize: file.byteSize, contentType: file.contentType, mediaType: file.mediaType, moderationStatus: "approved" as const, visibility: "public" as const, isProfilePhoto: file.isProfilePhoto, sortOrder: file.sortOrder }))),
    db.insert(listingPeriods).values({ id: `per_${crypto.randomUUID()}`, profileId: id, planName: "Cortesía inicial", startsAt: now, endsAt: new Date(Date.now() + 30 * 86_400_000).toISOString(), status: "active" }),
    db.update(users).set({ role: "advertiser" }).where(and(eq(users.id, owner.id), eq(users.role, "visitor"))),
    // R2 objects remain in place, referenced solely by the new listing.
    db.delete(privateSampleMedia).where(eq(privateSampleMedia.sampleId, row.id)),
    db.update(privateProfileSamples).set({ migratedProfileId: id, migratedAt: now, tokenHash: null, legacyTokenHash: null, tokenEncrypted: null, expiresAt: Date.now(), updatedAt: now }).where(eq(privateProfileSamples.id, row.id)),
    db.insert(adminAuditLogs).values({ id: `audit_${crypto.randomUUID()}`, actorUserId: admin.id, actorGithubLogin: admin.githubLogin, actorEmail: admin.email, actorName: admin.displayName, category: "profiles", action: "sample.migrate", entityType: "sample", entityId: row.id, entityLabel: row.displayName, summary: "Convirtió una muestra privada en anuncio real.", beforeData: JSON.stringify({ sampleId: row.id, provenance: row.provenance, ownerId: owner.id, escortCount: target.escortCount }), afterData: JSON.stringify({ profileId: id, ownerId: owner.id, additionalEscortAuthorized: override, escortCount: target.escortCount + 1 }) }),
    db.delete(collaborationGuards).where(eq(collaborationGuards.id, guard)),
  ], admin.id);
  return id;
}
