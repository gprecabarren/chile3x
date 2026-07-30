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
  role: text("role", { enum: ["visitor", "advertiser", "admin"] }).notNull().default("visitor"),
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
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt,
}, (table) => [index("profile_media_profile_idx").on(table.profileId, table.sortOrder)]);

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
  expiresAt: text("expires_at"),
  createdAt,
});

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
