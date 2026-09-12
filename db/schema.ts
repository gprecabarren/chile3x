import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const createdAt = text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  // Public account identifier. It is intentionally separate from an
  // announcement handle: one account can administer several announcements.
  // Existing accounts receive a generated value in the corresponding
  // migration; new accounts always receive one at creation time.
  username: text("username"),
  passwordHash: text("password_hash"),
  displayName: text("display_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  documentType: text("document_type", { enum: ["rut", "foreign"] }).notNull().default("rut"),
  documentNumber: text("document_number").notNull().default(""),
  foreignCountry: text("foreign_country").notNull().default(""),
  birthDate: text("birth_date").notNull().default("1990-01-01"),
  city: text("city").notNull().default(""),
  phone: text("phone"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  selfDisabledAt: text("self_disabled_at"),
  adminDisabledAt: text("admin_disabled_at"),
  role: text("role", { enum: ["visitor", "advertiser", "tester", "admin"] }).notNull().default("visitor"),
  emailVerifiedAt: text("email_verified_at"),
  createdAt,
}, (table) => [uniqueIndex("users_username_unique").on(table.username)]);

export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  authMethod: text("auth_method", { enum: ["password", "google", "github", "reactivation", "unknown"] }).notNull().default("unknown"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  countryCode: text("country_code"),
  region: text("region"),
  city: text("city"),
  timezone: text("timezone"),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at").notNull(),
  createdAt,
}, (table) => [
  index("auth_sessions_user_expires_idx").on(table.userId, table.expiresAt),
  index("auth_sessions_user_last_seen_idx").on(table.userId, table.lastSeenAt),
]);

// GitHub administrators keep an independent internal account and audit
// identity. The allow-list authorizes a login; this mapping makes actions
// attributable to the person who actually authenticated.
export const adminGithubIdentities = sqliteTable("admin_github_identities", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  githubUserId: text("github_user_id").notNull(),
  githubLogin: text("github_login").notNull(),
  githubEmail: text("github_email"),
  lastLoginAt: text("last_login_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt,
}, (table) => [
  uniqueIndex("admin_github_identity_user_unique").on(table.userId),
  uniqueIndex("admin_github_identity_id_unique").on(table.githubUserId),
  uniqueIndex("admin_github_identity_login_unique").on(table.githubLogin),
  uniqueIndex("admin_github_identity_email_unique").on(table.githubEmail),
]);

// Access to the administrative panel is granted explicitly to a GitHub
// account. Repository permissions are intentionally separate: being a GitHub
// collaborator never grants access to private Chile3X data by itself.
export const adminGithubAccess = sqliteTable("admin_github_access", {
  id: text("id").primaryKey(),
  githubLogin: text("github_login").notNull(),
  githubUserId: text("github_user_id"),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  accessLevel: text("access_level", {
    enum: ["owner", "administrator", "moderator", "editor", "support"],
  }).notNull().default("moderator"),
  protectedEmail: text("protected_email"),
  isProtectedOwner: integer("is_protected_owner", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  invitedBy: text("invited_by").references(() => users.id, { onDelete: "set null" }),
  revokedBy: text("revoked_by").references(() => users.id, { onDelete: "set null" }),
  revokedAt: text("revoked_at"),
  createdAt,
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("admin_github_access_login_unique").on(table.githubLogin),
  uniqueIndex("admin_github_access_id_unique").on(table.githubUserId),
  uniqueIndex("admin_github_access_user_unique").on(table.userId),
  uniqueIndex("admin_github_access_email_unique").on(table.protectedEmail),
  index("admin_github_access_active_level_idx").on(table.isActive, table.accessLevel),
]);

export const accountTokens = sqliteTable("account_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose", { enum: ["verify_email", "reset_password", "reactivate_account"] }).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt,
}, (table) => [
  index("account_tokens_user_purpose_idx").on(table.userId, table.purpose, table.expiresAt),
]);

// Google accounts are linked by the immutable OpenID Connect subject, never
// by a mutable display name. The verified email is retained to enforce the
// rule that a person cannot simultaneously own a public and administrative
// Chile3X identity.
export const accountGoogleIdentities = sqliteTable("account_google_identities", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  googleSubject: text("google_subject").notNull(),
  googleEmail: text("google_email").notNull(),
  lastLoginAt: text("last_login_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt,
}, (table) => [
  uniqueIndex("account_google_identity_user_unique").on(table.userId),
  uniqueIndex("account_google_identity_subject_unique").on(table.googleSubject),
  uniqueIndex("account_google_identity_email_unique").on(table.googleEmail),
]);

// A first Google sign-in may need the normal registration form. Only this
// short-lived, opaque server-side record carries the verified Google identity
// between the identity callback and the completed form.
export const googleRegistrationIntents = sqliteTable("google_registration_intents", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  googleSubject: text("google_subject").notNull(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  fullName: text("full_name"),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt,
}, (table) => [
  uniqueIndex("google_registration_intent_token_unique").on(table.tokenHash),
  index("google_registration_intent_expiry_idx").on(table.expiresAt, table.usedAt),
]);

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const adminAuditLogs = sqliteTable("admin_audit_logs", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actorGithubLogin: text("actor_github_login"),
  actorEmail: text("actor_email").notNull(),
  actorName: text("actor_name"),
  category: text("category").notNull(),
  action: text("action").notNull(),
  outcome: text("outcome", { enum: ["success", "failure"] }).notNull().default("success"),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  entityLabel: text("entity_label"),
  summary: text("summary").notNull(),
  beforeData: text("before_data"),
  afterData: text("after_data"),
  metadata: text("metadata"),
  createdAt,
}, (table) => [
  index("admin_audit_created_idx").on(table.createdAt),
  index("admin_audit_actor_created_idx").on(table.actorUserId, table.createdAt),
  index("admin_audit_category_created_idx").on(table.category, table.createdAt),
  index("admin_audit_action_created_idx").on(table.action, table.createdAt),
  index("admin_audit_entity_created_idx").on(table.entityType, table.entityId, table.createdAt),
]);

// Operational events intentionally contain no recipient addresses, tokens,
// request bodies or R2 object keys. They provide enough signal to diagnose
// delivery and runtime failures without becoming a second source of personal data.
export const operationalEvents = sqliteTable("operational_events", {
  id: text("id").primaryKey(),
  category: text("category", { enum: ["email", "authentication", "application", "storage", "audit", "telegram"] }).notNull(),
  eventName: text("event_name").notNull(),
  outcome: text("outcome", { enum: ["success", "failure"] }).notNull(),
  durationMs: integer("duration_ms"),
  detail: text("detail"),
  metadata: text("metadata"),
  createdAt,
}, (table) => [
  index("operational_events_created_idx").on(table.createdAt),
  index("operational_events_category_created_idx").on(table.category, table.createdAt),
  index("operational_events_outcome_created_idx").on(table.outcome, table.createdAt),
]);

// R2 enumeration is deliberately opt-in from the administrative summary.
// Snapshots retain aggregate counts only; private object keys are never copied
// into D1 or exposed by the dashboard.
export const operationalStorageSnapshots = sqliteTable("operational_storage_snapshots", {
  id: text("id").primaryKey(),
  status: text("status", { enum: ["complete", "partial", "failure"] }).notNull(),
  d1UsedBytes: integer("d1_used_bytes"),
  d1AllocatedBytes: integer("d1_allocated_bytes"),
  r2ObjectCount: integer("r2_object_count"),
  r2Bytes: integer("r2_bytes"),
  referencedObjectCount: integer("referenced_object_count"),
  orphanObjectCount: integer("orphan_object_count"),
  orphanBytes: integer("orphan_bytes"),
  missingObjectCount: integer("missing_object_count"),
  scanDurationMs: integer("scan_duration_ms"),
  scannedBy: text("scanned_by").references(() => users.id, { onDelete: "set null" }),
  createdAt,
}, (table) => [
  index("operational_storage_created_idx").on(table.createdAt),
]);

// Permanent deletion removes the account and all personal data. This
// pseudonymous tombstone only preserves the minimum history needed to tell an
// administrator that the same normalized email has registered before.
export const accountDeletionHistory = sqliteTable("account_deletion_history", {
  id: text("id").primaryKey(),
  emailHash: text("email_hash").notNull(),
  formerUserId: text("former_user_id").notNull(),
  deletedBy: text("deleted_by", { enum: ["user", "admin"] }).notNull(),
  deletedByAdminId: text("deleted_by_admin_id").references(() => users.id, { onDelete: "set null" }),
  originalCreatedAt: text("original_created_at").notNull(),
  deletedAt: text("deleted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("account_deletion_history_email_idx").on(table.emailHash, table.deletedAt),
]);

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  type: text("type", { enum: ["escort", "agency", "rental"] }).notNull(),
  status: text("status", { enum: ["draft", "pending", "approved", "paused", "rejected", "expired"] }).notNull().default("draft"),
  slug: text("slug").notNull().unique(),
  // The public @identifier belongs to an individual listing, never to the
  // account. It is nullable only while the migration assigns handles to the
  // listings that already existed before this field was introduced.
  handle: text("handle"),
  displayName: text("display_name").notNull(),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  region: text("region").notNull(),
  city: text("city").notNull(),
  comuna: text("comuna"),
  contactWhatsapp: text("contact_whatsapp"),
  contactTelegram: text("contact_telegram"),
  tier: text("tier", { enum: ["gold", "premium", "vip"] }).notNull().default("gold"),
  verificationStatus: text("verification_status", { enum: ["unreviewed", "in_review", "reviewed"] }).notNull().default("unreviewed"),
  verifiedAt: text("verified_at"),
  healthReviewStatus: text("health_review_status", { enum: ["not_requested", "in_review", "reviewed"] }).notNull().default("not_requested"),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  ownerHiddenAt: text("owner_hidden_at"),
  createdAt,
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("profiles_status_region_city_idx").on(table.status, table.region, table.city),
  index("profiles_owner_idx").on(table.ownerId),
  uniqueIndex("profiles_handle_unique").on(table.handle),
]);

export const profileTags = sqliteTable("profile_tags", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
  createdAt,
}, (table) => [uniqueIndex("profile_tag_unique").on(table.profileId, table.tag)]);

export const profileDetails = sqliteTable("profile_details", {
  profileId: text("profile_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  referenceLocation: text("reference_location"),
  schedule: text("schedule"),
  priceAmount: integer("price_amount"),
  currency: text("currency").notNull().default("CLP"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt,
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const profileServices = sqliteTable("profile_services", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["included", "additional"] }).notNull(),
  service: text("service").notNull(),
  createdAt,
}, (table) => [
  uniqueIndex("profile_service_unique").on(table.profileId, table.kind, table.service),
  index("profile_services_service_idx").on(table.service, table.kind),
]);

export const agencyMembers = sqliteTable("agency_members", {
  id: text("id").primaryKey(),
  agencyProfileId: text("agency_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  memberProfileId: text("member_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt,
}, (table) => [uniqueIndex("agency_member_unique").on(table.agencyProfileId, table.memberProfileId)]);

export const agencyMembershipRequests = sqliteTable("agency_membership_requests", {
  id: text("id").primaryKey(),
  agencyProfileId: text("agency_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  escortProfileId: text("escort_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  requestedBy: text("requested_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "accepted", "declined"] }).notNull().default("pending"),
  message: text("message"),
  respondedAt: text("responded_at"),
  createdAt,
}, (table) => [
  uniqueIndex("agency_membership_request_unique").on(table.agencyProfileId, table.escortProfileId),
  index("agency_membership_request_escort_status_idx").on(table.escortProfileId, table.status),
]);

export const profileMedia = sqliteTable("profile_media", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  mediaType: text("media_type", { enum: ["image", "video"] }).notNull(),
  r2Key: text("r2_key").notNull(),
  byteSize: integer("byte_size").notNull().default(0),
  contentType: text("content_type").notNull().default("image/jpeg"),
  altText: text("alt_text"),
  moderationStatus: text("moderation_status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  visibility: text("visibility", { enum: ["public", "exclusive"] }).notNull().default("public"),
  isProfilePhoto: integer("is_profile_photo", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt,
}, (table) => [index("profile_media_profile_idx").on(table.profileId, table.sortOrder)]);

// A view is stored once per profile, browser and Chilean calendar day. The
// browser key is an opaque first-party cookie; no IP address is retained.
export const profileViews = sqliteTable("profile_views", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  viewerKey: text("viewer_key").notNull(),
  viewedOn: text("viewed_on").notNull(),
  viewedAt: text("viewed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("profile_view_daily_unique").on(table.profileId, table.viewerKey, table.viewedOn),
  index("profile_views_profile_day_idx").on(table.profileId, table.viewedOn),
]);

export const profileContactEvents = sqliteTable("profile_contact_events", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  viewerKey: text("viewer_key").notNull(),
  kind: text("kind", { enum: ["whatsapp", "telegram", "call", "email", "instagram", "arsmate", "onlyfans", "videocall"] }).notNull(),
  clickedOn: text("clicked_on").notNull(),
  createdAt,
}, (table) => [
  uniqueIndex("profile_contact_event_daily_unique").on(table.profileId, table.viewerKey, table.kind, table.clickedOn),
  index("profile_contact_events_profile_day_idx").on(table.profileId, table.clickedOn),
]);

export const listingPeriods = sqliteTable("listing_periods", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  planName: text("plan_name").notNull(),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at").notNull(),
  status: text("status", { enum: ["active", "paused", "expired"] }).notNull().default("active"),
  pauseCount: integer("pause_count").notNull().default(0),
  pausedAt: text("paused_at"),
  adminNote: text("admin_note"),
  createdAt,
}, (table) => [index("listing_periods_profile_status_idx").on(table.profileId, table.status)]);

export const profileStatuses = sqliteTable("profile_statuses", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  storyType: text("story_type", { enum: ["text", "image"] }).notNull().default("text"),
  r2Key: text("r2_key"),
  contentType: text("content_type"),
  byteSize: integer("byte_size").notNull().default(0),
  expiresAt: text("expires_at"),
  createdAt,
});

// Identity and optional medical evidence are deliberately separate from public
// media. Their R2 keys are never included in a public profile response.
export const profileVerificationFiles = sqliteTable("profile_verification_files", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["identity", "medical"] }).notNull(),
  r2Key: text("r2_key").notNull(),
  byteSize: integer("byte_size").notNull().default(0),
  contentType: text("content_type").notNull(),
  createdAt,
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("profile_verification_file_unique").on(table.profileId, table.kind),
]);

export const favorites = sqliteTable("favorites", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt,
}, (table) => [uniqueIndex("favorite_unique").on(table.userId, table.profileId)]);

export const profileLikes = sqliteTable("profile_likes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt,
}, (table) => [uniqueIndex("profile_like_unique").on(table.userId, table.profileId)]);

// A signed-in visitor can ask to be notified if an announcement reaches a
// particular city. The visitor's email remains private and is resolved only
// when the announcement is approved in that city.
export const profileCityAlerts = sqliteTable("profile_city_alerts", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  city: text("city").notNull(),
  notifiedAt: text("notified_at"),
  createdAt,
}, (table) => [
  uniqueIndex("profile_city_alert_unique").on(table.profileId, table.userId, table.city),
  index("profile_city_alert_destination_idx").on(table.profileId, table.city, table.notifiedAt),
  index("profile_city_alert_user_idx").on(table.userId, table.notifiedAt),
]);

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  createdAt,
}, (table) => [index("reviews_profile_status_idx").on(table.profileId, table.status)]);

export const profileReports = sqliteTable("profile_reports", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  reporterId: text("reporter_id").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason", { enum: ["impersonation", "inappropriate", "fraud", "underage", "wrong_information", "other"] }).notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["pending", "reviewed", "resolved", "dismissed"] }).notNull().default("pending"),
  adminNote: text("admin_note"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt,
}, (table) => [
  index("profile_reports_status_created_idx").on(table.status, table.createdAt),
  index("profile_reports_profile_idx").on(table.profileId, table.createdAt),
]);

// Screenshots supplied with a report are kept in private R2 storage. The
// database only stores the opaque object key and metadata needed to authorize
// the reporter and the Chile3X team to view the evidence.
export const profileReportEvidence = sqliteTable("profile_report_evidence", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => profileReports.id, { onDelete: "cascade" }),
  r2Key: text("r2_key").notNull().unique(),
  byteSize: integer("byte_size").notNull().default(0),
  contentType: text("content_type").notNull(),
  createdAt,
}, (table) => [
  index("profile_report_evidence_report_idx").on(table.reportId, table.createdAt),
]);

export const blockedProfiles = sqliteTable("blocked_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt,
}, (table) => [uniqueIndex("blocked_profile_unique").on(table.userId, table.profileId)]);

export const profileExclusiveAccess = sqliteTable("profile_exclusive_access", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  grantedBy: text("granted_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt,
}, (table) => [
  uniqueIndex("profile_exclusive_access_unique").on(table.profileId, table.userId),
  index("profile_exclusive_access_user_idx").on(table.userId, table.profileId),
]);

export const newsMedia = sqliteTable("news_media", {
  id: text("id").primaryKey(),
  r2Key: text("r2_key").notNull().unique(),
  byteSize: integer("byte_size").notNull().default(0),
  contentType: text("content_type").notNull(),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt,
});

// Premium content belongs to an account rather than to an announcement. An
// account can associate that collection with one Escort announcement for its
// public preview, while the library and buyer access remain available if that
// announcement is paused or deleted.
export const exclusiveContentCollections = sqliteTable("exclusive_content_collections", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: text("profile_id").references(() => profiles.id, { onDelete: "set null" }),
  createdAt,
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("exclusive_content_collection_owner_unique").on(table.ownerId),
  uniqueIndex("exclusive_content_collection_profile_unique").on(table.profileId),
]);

export const exclusiveContentMedia = sqliteTable("exclusive_content_media", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id").notNull().references(() => exclusiveContentCollections.id, { onDelete: "cascade" }),
  mediaType: text("media_type", { enum: ["image", "video"] }).notNull(),
  r2Key: text("r2_key").notNull().unique(),
  byteSize: integer("byte_size").notNull().default(0),
  contentType: text("content_type").notNull().default("image/jpeg"),
  moderationStatus: text("moderation_status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt,
}, (table) => [index("exclusive_content_media_collection_idx").on(table.collectionId, table.sortOrder)]);

export const exclusiveContentAccess = sqliteTable("exclusive_content_access", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id").notNull().references(() => exclusiveContentCollections.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  grantedBy: text("granted_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt,
}, (table) => [
  uniqueIndex("exclusive_content_access_unique").on(table.collectionId, table.userId),
  index("exclusive_content_access_user_idx").on(table.userId, table.collectionId),
]);

// Private quality-assurance tickets. Only accounts explicitly created with the
// tester role can submit them; they never appear in public reporting flows.
export const bugReports = sqliteTable("bug_reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  pageUrl: text("page_url").notNull(),
  pageTitle: text("page_title").notNull().default(""),
  deviceType: text("device_type", { enum: ["desktop", "mobile"] }).notNull(),
  viewport: text("viewport").notNull().default(""),
  userAgent: text("user_agent").notNull().default(""),
  status: text("status", { enum: ["new", "reviewing", "waiting_tester", "in_progress", "resolved", "closed"] }).notNull().default("new"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt,
}, (table) => [
  index("bug_reports_status_updated_idx").on(table.status, table.updatedAt),
  index("bug_reports_reporter_updated_idx").on(table.reporterId, table.updatedAt),
]);

export const bugReportMessages = sqliteTable("bug_report_messages", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull().references(() => bugReports.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt,
}, (table) => [index("bug_report_messages_report_created_idx").on(table.reportId, table.createdAt)]);

export const newsPosts = sqliteTable("news_posts", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull().default(""),
  contentHtml: text("content_html").notNull(),
  coverMediaId: text("cover_media_id").references(() => newsMedia.id, { onDelete: "set null" }),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  seoTitle: text("seo_title"),
  metaDescription: text("meta_description"),
  focusKeyword: text("focus_keyword"),
  canonicalUrl: text("canonical_url"),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  noindex: integer("noindex", { mode: "boolean" }).notNull().default(false),
  publishedAt: text("published_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt,
}, (table) => [
  index("news_posts_public_idx").on(table.status, table.publishedAt, table.createdAt),
]);

// Telegram is an optional extension of a normal Chile3X account. D1 remains
// authoritative: Telegram identifiers never grant access on their own and a
// disabled or deleted account is removed from the private Members space.
export const telegramAccountLinks = sqliteTable("telegram_account_links", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  telegramUserId: text("telegram_user_id").notNull(),
  username: text("username"),
  firstName: text("first_name"),
  status: text("status", { enum: ["linked", "revoked", "banned"] }).notNull().default("linked"),
  linkedAt: text("linked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  revokedAt: text("revoked_at"),
  revokeReason: text("revoke_reason"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("telegram_account_links_user_unique").on(table.userId),
  uniqueIndex("telegram_account_links_telegram_unique").on(table.telegramUserId),
  index("telegram_account_links_status_idx").on(table.status, table.updatedAt),
]);

// Administrative Telegram identities are kept separate from public account
// links, just like the GitHub-only administrative sign-in on the website.
export const telegramAdminIdentities = sqliteTable("telegram_admin_identities", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  telegramUserId: text("telegram_user_id").notNull(),
  username: text("username"),
  firstName: text("first_name"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  linkedAt: text("linked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("telegram_admin_identities_user_unique").on(table.userId),
  uniqueIndex("telegram_admin_identities_telegram_unique").on(table.telegramUserId),
]);

// One-time web-to-bot handshakes. Only the SHA-256 digest of the deep-link
// secret is stored; the candidate Telegram identity still needs confirmation
// in the originating authenticated web session.
export const telegramLinkAttempts = sqliteTable("telegram_link_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subjectType: text("subject_type", { enum: ["account", "admin"] }).notNull(),
  tokenHash: text("token_hash").notNull(),
  status: text("status", { enum: ["pending", "candidate", "confirmed", "cancelled", "expired"] }).notNull().default("pending"),
  candidateTelegramUserId: text("candidate_telegram_user_id"),
  candidateUsername: text("candidate_username"),
  candidateFirstName: text("candidate_first_name"),
  expiresAt: text("expires_at").notNull(),
  candidateAt: text("candidate_at"),
  confirmedAt: text("confirmed_at"),
  createdAt,
}, (table) => [
  uniqueIndex("telegram_link_attempts_token_unique").on(table.tokenHash),
  index("telegram_link_attempts_user_status_idx").on(table.userId, table.status, table.expiresAt),
]);

// Chats are discovered from Telegram updates and assigned an explicit role by
// Chile3X. The Members chat is never exposed in public HTML or public APIs.
export const telegramChats = sqliteTable("telegram_chats", {
  id: text("id").primaryKey(),
  telegramChatId: text("telegram_chat_id").notNull(),
  role: text("role", { enum: ["unassigned", "public", "members"] }).notNull().default("unassigned"),
  title: text("title").notNull().default(""),
  username: text("username"),
  chatType: text("chat_type").notNull().default("supergroup"),
  isForum: integer("is_forum", { mode: "boolean" }).notNull().default(false),
  updatesThreadId: text("updates_thread_id"),
  botIsAdministrator: integer("bot_is_administrator", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt,
}, (table) => [
  uniqueIndex("telegram_chats_telegram_unique").on(table.telegramChatId),
  index("telegram_chats_role_active_idx").on(table.role, table.isActive),
]);

export const telegramMemberships = sqliteTable("telegram_memberships", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  linkId: text("link_id").notNull().references(() => telegramAccountLinks.id, { onDelete: "cascade" }),
  telegramUserId: text("telegram_user_id").notNull(),
  telegramChatId: text("telegram_chat_id").notNull(),
  status: text("status", { enum: ["pending", "active", "left", "revoked", "banned"] }).notNull().default("pending"),
  joinedAt: text("joined_at"),
  leftAt: text("left_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt,
}, (table) => [
  uniqueIndex("telegram_memberships_user_chat_unique").on(table.userId, table.telegramChatId),
  uniqueIndex("telegram_memberships_telegram_chat_unique").on(table.telegramUserId, table.telegramChatId),
  index("telegram_memberships_status_idx").on(table.status, table.updatedAt),
]);

export const telegramConfiguration = sqliteTable("telegram_configuration", {
  id: text("id").primaryKey(),
  botUsername: text("bot_username").notNull().default(""),
  publicCommunityUrl: text("public_community_url").notNull().default(""),
  rulesText: text("rules_text").notNull().default(""),
  prohibitedTerms: text("prohibited_terms").notNull().default(""),
  moderationEnabled: integer("moderation_enabled", { mode: "boolean" }).notNull().default(true),
  autoBanEnabled: integer("auto_ban_enabled", { mode: "boolean" }).notNull().default(true),
  floodMaxMessages: integer("flood_max_messages").notNull().default(8),
  floodWindowSeconds: integer("flood_window_seconds").notNull().default(20),
  duplicateWindowSeconds: integer("duplicate_window_seconds").notNull().default(90),
  maxLinksPerMessage: integer("max_links_per_message").notNull().default(2),
  strikeBanThreshold: integer("strike_ban_threshold").notNull().default(3),
  temporaryRestrictionMinutes: integer("temporary_restriction_minutes").notNull().default(1440),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Short, operational site updates. They intentionally remain separate from
// the editorial news/blog model and can be synchronized in both directions.
export const telegramBulletins = sqliteTable("telegram_bulletins", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  source: text("source", { enum: ["web", "telegram"] }).notNull(),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  authorUserId: text("author_user_id").references(() => users.id, { onDelete: "set null" }),
  sourceTelegramChatId: text("source_telegram_chat_id"),
  sourceTelegramMessageId: text("source_telegram_message_id"),
  publishedAt: text("published_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt,
}, (table) => [
  index("telegram_bulletins_public_idx").on(table.status, table.publishedAt, table.createdAt),
  uniqueIndex("telegram_bulletins_source_message_unique").on(table.sourceTelegramChatId, table.sourceTelegramMessageId),
]);

export const telegramPublications = sqliteTable("telegram_publications", {
  id: text("id").primaryKey(),
  bulletinId: text("bulletin_id").notNull().references(() => telegramBulletins.id, { onDelete: "cascade" }),
  telegramChatId: text("telegram_chat_id").notNull(),
  telegramThreadId: text("telegram_thread_id"),
  telegramMessageId: text("telegram_message_id"),
  status: text("status", { enum: ["pending", "published", "failed", "deleted"] }).notNull().default("pending"),
  lastError: text("last_error"),
  publishedAt: text("published_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt,
}, (table) => [
  uniqueIndex("telegram_publications_bulletin_chat_unique").on(table.bulletinId, table.telegramChatId),
  uniqueIndex("telegram_publications_message_unique").on(table.telegramChatId, table.telegramMessageId),
  index("telegram_publications_status_idx").on(table.status, table.updatedAt),
]);

// Webhook payloads are retained only briefly for at-least-once processing and
// deduplication. A scheduled cleanup removes old payloads automatically.
export const telegramWebhookUpdates = sqliteTable("telegram_webhook_updates", {
  updateId: text("update_id").primaryKey(),
  updateType: text("update_type").notNull(),
  payload: text("payload").notNull(),
  status: text("status", { enum: ["pending", "processing", "processed", "failed"] }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  processedAt: text("processed_at"),
  receivedAt: text("received_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("telegram_webhook_updates_status_idx").on(table.status, table.receivedAt),
]);

// Minimal recent-message fingerprints support flood and duplicate detection.
// Raw message bodies are not retained here.
export const telegramMessageEvents = sqliteTable("telegram_message_events", {
  id: text("id").primaryKey(),
  telegramChatId: text("telegram_chat_id").notNull(),
  telegramMessageId: text("telegram_message_id").notNull(),
  telegramUserId: text("telegram_user_id").notNull(),
  bodyHash: text("body_hash").notNull(),
  linkCount: integer("link_count").notNull().default(0),
  createdAt,
}, (table) => [
  uniqueIndex("telegram_message_events_message_unique").on(table.telegramChatId, table.telegramMessageId),
  index("telegram_message_events_user_created_idx").on(table.telegramChatId, table.telegramUserId, table.createdAt),
  index("telegram_message_events_hash_created_idx").on(table.telegramChatId, table.telegramUserId, table.bodyHash, table.createdAt),
]);

export const telegramModerationCases = sqliteTable("telegram_moderation_cases", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  telegramUserId: text("telegram_user_id").notNull(),
  telegramUsername: text("telegram_username"),
  telegramChatId: text("telegram_chat_id").notNull(),
  telegramMessageId: text("telegram_message_id"),
  ruleCode: text("rule_code").notNull(),
  reason: text("reason").notNull(),
  evidenceSnippet: text("evidence_snippet"),
  severity: text("severity", { enum: ["low", "medium", "high", "critical"] }).notNull(),
  action: text("action", { enum: ["observed", "warn", "delete", "restrict", "ban", "unban"] }).notNull(),
  status: text("status", { enum: ["open", "resolved", "dismissed"] }).notNull().default("open"),
  automated: integer("automated", { mode: "boolean" }).notNull().default(false),
  actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actorTelegramUserId: text("actor_telegram_user_id"),
  restrictionEndsAt: text("restriction_ends_at"),
  resolvedAt: text("resolved_at"),
  createdAt,
}, (table) => [
  index("telegram_moderation_cases_status_created_idx").on(table.status, table.createdAt),
  index("telegram_moderation_cases_user_created_idx").on(table.telegramUserId, table.createdAt),
  index("telegram_moderation_cases_chat_created_idx").on(table.telegramChatId, table.createdAt),
]);

// D1 outbox rows survive account deletion and make Telegram side effects
// retryable. Queue messages contain only this opaque job id.
export const telegramOutboxJobs = sqliteTable("telegram_outbox_jobs", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["publish_bulletin", "edit_bulletin", "delete_bulletin", "send_member_invite", "revoke_member", "ban_member", "unban_member", "notify_admin"] }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  entityId: text("entity_id"),
  payload: text("payload").notNull(),
  status: text("status", { enum: ["pending", "processing", "succeeded", "failed"] }).notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: text("available_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastError: text("last_error"),
  completedAt: text("completed_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt,
}, (table) => [
  index("telegram_outbox_jobs_status_available_idx").on(table.status, table.availableAt),
  index("telegram_outbox_jobs_user_idx").on(table.userId, table.createdAt),
]);

export const telegramAuditEvents = sqliteTable("telegram_audit_events", {
  id: text("id").primaryKey(),
  actorType: text("actor_type", { enum: ["admin", "telegram_admin", "account", "bot", "system"] }).notNull(),
  actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actorTelegramUserId: text("actor_telegram_user_id"),
  action: text("action").notNull(),
  outcome: text("outcome", { enum: ["success", "failure"] }).notNull().default("success"),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  summary: text("summary").notNull(),
  metadata: text("metadata"),
  createdAt,
}, (table) => [
  index("telegram_audit_events_created_idx").on(table.createdAt),
  index("telegram_audit_events_action_created_idx").on(table.action, table.createdAt),
  index("telegram_audit_events_actor_created_idx").on(table.actorUserId, table.createdAt),
]);
