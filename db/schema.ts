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
  passwordHash: text("password_hash"),
  displayName: text("display_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  documentType: text("document_type", { enum: ["rut", "foreign"] }).notNull().default("rut"),
  documentNumber: text("document_number").notNull().default(""),
  birthDate: text("birth_date").notNull().default("1990-01-01"),
  city: text("city").notNull().default(""),
  phone: text("phone"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  role: text("role", { enum: ["visitor", "advertiser", "admin"] }).notNull().default("visitor"),
  emailVerifiedAt: text("email_verified_at"),
  createdAt,
});

export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt,
}, (table) => [
  index("auth_sessions_user_expires_idx").on(table.userId, table.expiresAt),
]);

export const accountTokens = sqliteTable("account_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose", { enum: ["verify_email", "reset_password"] }).notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt,
}, (table) => [
  index("account_tokens_user_purpose_idx").on(table.userId, table.purpose, table.expiresAt),
]);

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  type: text("type", { enum: ["escort", "agency", "rental"] }).notNull(),
  status: text("status", { enum: ["draft", "pending", "approved", "paused", "rejected", "expired"] }).notNull().default("draft"),
  slug: text("slug").notNull().unique(),
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
  healthReviewStatus: text("health_review_status", { enum: ["not_requested", "in_review", "reviewed"] }).notNull().default("not_requested"),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt,
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("profiles_status_region_city_idx").on(table.status, table.region, table.city),
  index("profiles_owner_idx").on(table.ownerId),
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
  kind: text("kind", { enum: ["whatsapp", "telegram", "call", "email", "instagram", "arsmate", "videocall"] }).notNull(),
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
