# Mapa del esquema D1

Referencia: `db/schema.ts` del checkout de trabajo de esta entrega, contrastado el 25 de octubre de 2026; revisión documental de migraciones el 27 de octubre. Inventario de código, sin consultar ni exportar datos remotos. Las 67 migraciones de `drizzle/` determinan el esquema SQL aplicado, sus triggers e índices adicionales; este documento no demuestra cuáles están aplicadas en producción. La revisión legal `0065` modifica contenido versionado y la limpieza `0066` elimina ocho instantáneas históricas expresamente indicadas por el propietario; ninguna agrega tablas permanentes.

El esquema tipado declara **92 tablas**, **813 columnas** y **105 relaciones de clave foránea**. Los nombres son metadatos públicos del código; aquí no hay valores de cuentas, tokens ni archivos.

Convenciones: PK = clave primaria; obligatorio = NOT NULL; predeterminado = el esquema declara un default. Las enumeraciones de Drizzle son contratos de tipo y deben contrastarse con los CHECK y triggers del SQL; no equivalen por sí solas a validación del motor.

## Tablas

### account_apple_identities

Exportación: `accountAppleIdentities` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `apple_subject:text` obligatorio; `apple_email:text` obligatorio; `refresh_token_encrypted:text`; `last_login_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `account_apple_identity_user_unique` UNIQUE (user_id); `account_apple_identity_subject_unique` UNIQUE (apple_subject); `account_apple_identity_email_unique` UNIQUE (apple_email).

### account_auth_events

Exportación: `accountAuthEvents` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `provider:text` obligatorio {`password`, `google`, `apple`, `x`}; `action:text` obligatorio {`linked`, `unlinked`, `password_created`, `password_changed`}; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `account_auth_events_user_created_idx` (user_id, created_at).

### account_deletion_history

Exportación: `accountDeletionHistory` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `email_hash:text` obligatorio; `former_user_id:text` obligatorio; `deleted_by:text` obligatorio {`user`, `admin`}; `deleted_by_admin_id:text`; `original_created_at:text` obligatorio; `deleted_at:text` obligatorio predeterminado.

**Relaciones:** `deleted_by_admin_id` → `users(id)` (delete set null).

**Índices del esquema:** `account_deletion_history_email_idx` (email_hash, deleted_at).

### account_google_identities

Exportación: `accountGoogleIdentities` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `google_subject:text` obligatorio; `google_email:text` obligatorio; `last_login_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `account_google_identity_user_unique` UNIQUE (user_id); `account_google_identity_subject_unique` UNIQUE (google_subject); `account_google_identity_email_unique` UNIQUE (google_email).

### account_legal_acceptances

Exportación: `accountLegalAcceptances` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `terms_version:text` obligatorio; `privacy_version:text` obligatorio; `accepted_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `account_legal_acceptances_user_idx` (user_id).

### account_presence

Exportación: `accountPresence` en [schema.ts](../db/schema.ts).

**Columnas:** `user_id:text` PK; `last_active_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `account_presence_active_idx` (last_active_at).

### account_tokens

Exportación: `accountTokens` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `purpose:text` obligatorio {`verify_email`, `reset_password`, `reactivate_account`}; `token_hash:text` obligatorio; `expires_at:text` obligatorio; `used_at:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `account_tokens_user_purpose_idx` (user_id, purpose, expires_at).

### account_x_identities

Exportación: `accountXIdentities` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `x_subject:text` obligatorio; `x_username:text` obligatorio; `last_login_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

### admin_audit_logs

Exportación: `adminAuditLogs` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `actor_user_id:text`; `actor_github_login:text`; `actor_email:text` obligatorio; `actor_name:text`; `category:text` obligatorio; `action:text` obligatorio; `outcome:text` obligatorio predeterminado {`success`, `failure`}; `entity_type:text` obligatorio; `entity_id:text`; `entity_label:text`; `summary:text` obligatorio; `before_data:text`; `after_data:text`; `metadata:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `actor_user_id` → `users(id)` (delete set null).

**Índices del esquema:** `admin_audit_created_idx` (created_at); `admin_audit_actor_created_idx` (actor_user_id, created_at); `admin_audit_category_created_idx` (category, created_at); `admin_audit_action_created_idx` (action, created_at); `admin_audit_entity_created_idx` (entity_type, entity_id, created_at).

### admin_github_access

Exportación: `adminGithubAccess` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `github_login:text` obligatorio; `github_user_id:text`; `user_id:text`; `access_level:text` obligatorio predeterminado {`owner`, `administrator`, `moderator`, `editor`, `support`}; `protected_email:text`; `is_protected_owner:integer` obligatorio predeterminado; `is_active:integer` obligatorio predeterminado; `invited_by:text`; `revoked_by:text`; `revoked_at:text`; `created_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete set null); `invited_by` → `users(id)` (delete set null); `revoked_by` → `users(id)` (delete set null).

**Índices del esquema:** `admin_github_access_login_unique` UNIQUE (github_login); `admin_github_access_id_unique` UNIQUE (github_user_id); `admin_github_access_user_unique` UNIQUE (user_id); `admin_github_access_email_unique` UNIQUE (protected_email); `admin_github_access_active_level_idx` (is_active, access_level).

Flujo de aplicación desde el 28 de octubre: las invitaciones nuevas resuelven `github_user_id` desde la cuenta personal existente en GitHub antes de insertarse. `user_id` se vincula solo después del OAuth con correo verificado. La corrección de una invitación exige `user_id IS NULL`, concesión activa y coincidencia con el usuario/ID previamente leído; conserva correo y nivel. No cambia el esquema ni necesita migración. La autorización efectiva sigue requiriendo la concesión activa y sus capacidades.

### admin_github_identities

Exportación: `adminGithubIdentities` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `github_user_id:text` obligatorio; `github_login:text` obligatorio; `github_email:text`; `last_login_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `admin_github_identity_user_unique` UNIQUE (user_id); `admin_github_identity_id_unique` UNIQUE (github_user_id); `admin_github_identity_login_unique` UNIQUE (github_login); `admin_github_identity_email_unique` UNIQUE (github_email).

### admin_mutation_receipts

Exportación: `adminMutationReceipts` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `actor_id:text` obligatorio; `resource_key:text` obligatorio; `expires_at:integer` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `actor_id` → `users(id)` (delete cascade).

**Índices del esquema:** `admin_mutation_receipts_expiry_idx` (expires_at).

### admin_notifications

Exportación: `adminNotifications` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `kind:text` obligatorio {`account_registered`, `profile_created`, `profile_updated`, `media_uploaded`}; `actor_user_id:text`; `profile_id:text`; `summary:text` obligatorio; `read_at:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `actor_user_id` → `users(id)` (delete set null); `profile_id` → `profiles(id)` (delete set null).

**Índices del esquema:** `admin_notifications_unread_created_idx` (read_at, created_at); `admin_notifications_kind_created_idx` (kind, created_at); `admin_notifications_actor_created_idx` (actor_user_id, created_at); `admin_notifications_profile_created_idx` (profile_id, read_at, created_at).

### agency_members

Exportación: `agencyMembers` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `agency_profile_id:text` obligatorio; `member_profile_id:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `agency_profile_id` → `profiles(id)` (delete cascade); `member_profile_id` → `profiles(id)` (delete cascade).

**Índices del esquema:** `agency_member_unique` UNIQUE (agency_profile_id, member_profile_id).

### agency_membership_requests

Exportación: `agencyMembershipRequests` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `agency_profile_id:text` obligatorio; `escort_profile_id:text` obligatorio; `requested_by:text` obligatorio; `status:text` obligatorio predeterminado {`pending`, `accepted`, `declined`}; `message:text`; `responded_at:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `agency_profile_id` → `profiles(id)` (delete cascade); `escort_profile_id` → `profiles(id)` (delete cascade); `requested_by` → `users(id)` (delete cascade).

**Índices del esquema:** `agency_membership_request_unique` UNIQUE (agency_profile_id, escort_profile_id); `agency_membership_request_escort_status_idx` (escort_profile_id, status).

### apple_auth_attempts

Exportación: `appleAuthAttempts` en [schema.ts](../db/schema.ts).

**Columnas:** `previous_sessions:text` obligatorio predeterminado; `id:text` PK; `state_hash:text` obligatorio; `nonce:text` obligatorio; `intent:text` obligatorio {`login`, `register`}; `return_to:text` obligatorio; `expires_at:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Índices del esquema:** `apple_auth_attempt_state_unique` UNIQUE (state_hash); `apple_auth_attempt_expiry_idx` (expires_at).

### apple_registration_intents

Exportación: `appleRegistrationIntents` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `token_hash:text` obligatorio; `apple_subject:text` obligatorio; `email:text` obligatorio; `display_name:text`; `full_name:text`; `refresh_token_encrypted:text`; `expires_at:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Índices del esquema:** `apple_registration_intent_token_unique` UNIQUE (token_hash); `apple_registration_intent_expiry_idx` (expires_at).

### auth_session_completions

Exportación: `authSessionCompletions` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `token_hash:text` obligatorio; `return_to:text` obligatorio; `previous_sessions:text` obligatorio predeterminado; `expires_at:text` obligatorio.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `auth_session_completions_expiry_idx` (expires_at).

### auth_sessions

Exportación: `authSessions` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `token_hash:text` obligatorio; `browser_key_hash:text`; `auth_method:text` obligatorio predeterminado {`password`, `google`, `apple`, `x`, `github`, `reactivation`, `unknown`}; `ip_address:text`; `user_agent:text`; `country_code:text`; `region:text`; `city:text`; `timezone:text`; `last_seen_at:text` obligatorio predeterminado; `expires_at:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `auth_sessions_browser_key_unique` UNIQUE (browser_key_hash); `auth_sessions_user_expires_idx` (user_id, expires_at); `auth_sessions_user_last_seen_idx` (user_id, last_seen_at).

### blocked_profiles

Exportación: `blockedProfiles` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `profile_id:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade); `profile_id` → `profiles(id)` (delete cascade).

**Índices del esquema:** `blocked_profile_unique` UNIQUE (user_id, profile_id).

### bug_report_messages

Exportación: `bugReportMessages` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `report_id:text` obligatorio; `author_id:text` obligatorio; `body:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `report_id` → `bug_reports(id)` (delete cascade); `author_id` → `users(id)` (delete cascade).

**Índices del esquema:** `bug_report_messages_report_created_idx` (report_id, created_at).

### bug_reports

Exportación: `bugReports` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `reporter_id:text` obligatorio; `title:text` obligatorio; `description:text` obligatorio; `page_url:text` obligatorio; `page_title:text` obligatorio predeterminado; `device_type:text` obligatorio {`desktop`, `mobile`}; `viewport:text` obligatorio predeterminado; `user_agent:text` obligatorio predeterminado; `status:text` obligatorio predeterminado {`new`, `reviewing`, `waiting_tester`, `in_progress`, `resolved`, `closed`}; `updated_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `reporter_id` → `users(id)` (delete cascade).

**Índices del esquema:** `bug_reports_status_updated_idx` (status, updated_at); `bug_reports_reporter_updated_idx` (reporter_id, updated_at).

### collaboration_guards

Exportación: `collaborationGuards` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `allowed:integer` obligatorio.

**CHECK declarados:** `collaboration_conflict`.

### data_deletion_jobs

Exportación: `dataDeletionJobs` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `r2_key:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Índices del esquema:** `data_deletion_jobs_created_idx` (created_at).

### data_retention_holds

Exportación: `dataRetentionHolds` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `entity_type:text` obligatorio {`verification`, `report`, `conversation`, `audit`, `deletion`, `forum_attachment`, `forum_report`}; `entity_id:text` obligatorio; `reason:text` obligatorio; `created_by:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Índices del esquema:** `data_retention_hold_entity_unique` UNIQUE (entity_type, entity_id).

### email_delivery_logs

Exportación: `emailDeliveryLogs` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text`; `recipient:text` obligatorio; `audience:text` obligatorio {`account`, `admin`, `owner`, `other`}; `kind:text` obligatorio; `subject:text` obligatorio; `status:text` obligatorio {`sending`, `accepted`, `failed`, `skipped`}; `provider:text` {`google_relay`, `cloudflare_email`}; `detail:text`; `attempts:text`; `duration_ms:integer`; `finished_at:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `email_delivery_created_idx` (created_at); `email_delivery_recipient_created_idx` (recipient, created_at); `email_delivery_kind_created_idx` (kind, created_at); `email_delivery_status_created_idx` (status, created_at).

### exclusive_content_access

Exportación: `exclusiveContentAccess` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `collection_id:text` obligatorio; `user_id:text` obligatorio; `granted_by:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `collection_id` → `exclusive_content_collections(id)` (delete cascade); `user_id` → `users(id)` (delete cascade); `granted_by` → `users(id)` (delete cascade).

**Índices del esquema:** `exclusive_content_access_unique` UNIQUE (collection_id, user_id); `exclusive_content_access_user_idx` (user_id, collection_id).

### exclusive_content_collections

Exportación: `exclusiveContentCollections` en [schema.ts](../db/schema.ts).

**Columnas:** `revision:integer` obligatorio predeterminado; `id:text` PK; `owner_id:text` obligatorio; `profile_id:text`; `created_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `owner_id` → `users(id)` (delete cascade); `profile_id` → `profiles(id)` (delete set null).

**Índices del esquema:** `exclusive_content_collection_owner_unique` UNIQUE (owner_id); `exclusive_content_collection_profile_unique` UNIQUE (profile_id).

### exclusive_content_media

Exportación: `exclusiveContentMedia` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `collection_id:text` obligatorio; `media_type:text` obligatorio {`image`, `video`}; `r2_key:text` obligatorio; `byte_size:integer` obligatorio predeterminado; `content_type:text` obligatorio predeterminado; `moderation_status:text` obligatorio predeterminado {`pending`, `approved`, `rejected`}; `sort_order:integer` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `collection_id` → `exclusive_content_collections(id)` (delete cascade).

**Índices del esquema:** `exclusive_content_media_collection_idx` (collection_id, sort_order); `exclusive_content_pending_review_idx` (collection_id).

### favorites

Exportación: `favorites` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `profile_id:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade); `profile_id` → `profiles(id)` (delete cascade).

**Índices del esquema:** `favorite_unique` UNIQUE (user_id, profile_id).

### forum_attachments

Exportación: `forumAttachments` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `post_id:text` obligatorio; `uploaded_by:text`; `media_type:text` obligatorio {`image`, `video`}; `r2_key:text` obligatorio; `byte_size:integer` obligatorio; `content_type:text` obligatorio; `moderation_status:text` obligatorio predeterminado {`pending`, `approved`, `rejected`}; `consent_version:text` obligatorio; `reviewed_by:text`; `reviewed_at:text`; `deleted_at:text`; `created_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `post_id` → `forum_posts(id)` (delete cascade).

**Índices del esquema:** `forum_attachments_post_idx` (post_id, deleted_at); `forum_attachments_moderation_idx` (moderation_status, updated_at).

### forum_notifications

Exportación: `forumNotifications` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `recipient_id:text` obligatorio; `topic_id:text` obligatorio; `post_id:text`; `read_at:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `recipient_id` → `users(id)` (delete cascade); `topic_id` → `forum_topics(id)` (delete cascade); `post_id` → `forum_posts(id)` (delete cascade).

**Índices del esquema:** `forum_notification_post_recipient_unique` UNIQUE (post_id, recipient_id); `forum_notifications_recipient_idx` (recipient_id, read_at, created_at).

### forum_posts

Exportación: `forumPosts` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `topic_id:text` obligatorio; `author_id:text`; `author_name:text` obligatorio; `body:text` obligatorio; `trashed_at:text`; `created_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `topic_id` → `forum_topics(id)`.

**Índices del esquema:** `forum_posts_topic_idx` (topic_id, created_at, id).

### forum_rate_limits

Exportación: `forumRateLimits` en [schema.ts](../db/schema.ts).

**Columnas:** `key:text` PK; `window_start:integer` obligatorio; `hits:integer` obligatorio; `updated_at:text` obligatorio.

### forum_reports

Exportación: `forumReports` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `post_id:text` obligatorio; `reporter_id:text`; `reason:text` obligatorio; `detail:text` obligatorio; `post_version:text` obligatorio; `status:text` obligatorio predeterminado {`open`, `resolved`, `dismissed`}; `resolution:text`; `resolved_by:text`; `resolved_at:text`; `created_at:text` obligatorio predeterminado; `decision_token:text`.

**Relaciones:** `post_id` → `forum_posts(id)` (delete cascade); `reporter_id` → `users(id)` (delete set null).

**Índices del esquema:** `forum_report_post_reporter_unique` UNIQUE (post_id, reporter_id); `forum_reports_queue_idx` (status, created_at).

### forum_rule_acceptances

Exportación: `forumRuleAcceptances` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `version:text` obligatorio; `accepted_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `forum_acceptance_user_version_unique` UNIQUE (user_id, version).

### forum_sections

Exportación: `forumSections` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `group_name:text` obligatorio; `title:text` obligatorio; `description:text` obligatorio predeterminado; `rules:text` obligatorio predeterminado; `sort_order:integer` obligatorio predeterminado; `is_archived:integer` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Índices del esquema:** `forum_sections_order_idx` (is_archived, group_name, sort_order).

### forum_settings

Exportación: `forumSettings` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `rules:text` obligatorio; `version:text` obligatorio; `updated_by:text`; `updated_at:text` obligatorio predeterminado.

### forum_topics

Exportación: `forumTopics` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `section_id:text` obligatorio; `title:text` obligatorio; `author_id:text`; `author_name:text` obligatorio; `is_pinned:integer` obligatorio predeterminado; `is_locked:integer` obligatorio predeterminado; `trashed_at:text`; `created_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `section_id` → `forum_sections(id)`.

**Índices del esquema:** `forum_topics_section_idx` (section_id, trashed_at, is_pinned, updated_at); `forum_topics_activity_idx` (trashed_at, updated_at).

### forum_watches

Exportación: `forumWatches` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `topic_id:text` obligatorio; `user_id:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `topic_id` → `forum_topics(id)` (delete cascade); `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `forum_watch_user_topic_unique` UNIQUE (user_id, topic_id); `forum_watches_topic_idx` (topic_id).

### google_registration_intents

Exportación: `googleRegistrationIntents` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `token_hash:text` obligatorio; `google_subject:text` obligatorio; `email:text` obligatorio; `display_name:text`; `full_name:text`; `expires_at:text` obligatorio; `used_at:text`; `created_at:text` obligatorio predeterminado.

**Índices del esquema:** `google_registration_intent_token_unique` UNIQUE (token_hash); `google_registration_intent_expiry_idx` (expires_at, used_at).

### help_guides

Exportación: `helpGuides` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `audience:text` obligatorio {`account`, `admin`, `all`}; `capability:text`; `tester_only:integer` obligatorio predeterminado; `category:text` obligatorio; `title:text` obligatorio; `aliases:text` obligatorio predeterminado; `summary:text` obligatorio; `steps:text` obligatorio; `link_href:text` obligatorio; `link_label:text` obligatorio; `link_target:text`; `is_published:integer` obligatorio predeterminado; `is_deleted:integer` obligatorio predeterminado; `updated_by:text`; `updated_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Índices del esquema:** `help_guides_audience_idx` (audience, is_published, is_deleted).

### legal_document_versions

Exportación: `legalDocumentVersions` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `document_id:text` obligatorio; `version:text` obligatorio; `document_json:text` obligatorio; `published_at:text` obligatorio; `published_by:text`.

**Relaciones:** `document_id` → `legal_documents(id)`.

**Índices del esquema:** `legal_document_version_unique` UNIQUE (document_id, version).

`0066_legal_history_cleanup.sql` elimina únicamente las ocho versiones anteriores identificadas en la propia migración. Excluye de la eliminación la versión que esté vigente en `legal_documents`; conserva esa tabla y las constancias de `account_legal_acceptances`.

### legal_documents

Exportación: `legalDocuments` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK {`terms`, `privacy`}; `published_json:text`; `draft_json:text`; `version:text` obligatorio predeterminado; `published_at:text` obligatorio predeterminado; `updated_by:text`; `updated_at:text` obligatorio predeterminado; `revision:integer` obligatorio predeterminado.

### listing_periods

Exportación: `listingPeriods` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `profile_id:text` obligatorio; `plan_name:text` obligatorio; `starts_at:text` obligatorio; `ends_at:text` obligatorio; `status:text` obligatorio predeterminado {`active`, `paused`, `expired`}; `pause_count:integer` obligatorio predeterminado; `paused_at:text`; `admin_note:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `profile_id` → `profiles(id)` (delete cascade).

**Índices del esquema:** `listing_periods_profile_status_idx` (profile_id, status).

### message_conversation_preferences

Exportación: `messageConversationPreferences` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `conversation_id:text` obligatorio; `user_id:text` obligatorio; `is_muted:integer` obligatorio predeterminado; `blocked_at:text`; `last_read_at:text`; `updated_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `conversation_id` → `message_conversations(id)` (delete cascade); `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `message_conversation_preferences_user_unique` UNIQUE (conversation_id, user_id); `message_conversation_preferences_user_idx` (user_id, updated_at).

### message_conversations

Exportación: `messageConversations` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `profile_id:text`; `visitor_user_id:text`; `owner_user_id:text`; `last_message_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `profile_id` → `profiles(id)` (delete set null); `visitor_user_id` → `users(id)` (delete set null); `owner_user_id` → `users(id)` (delete set null).

**Índices del esquema:** `message_conversations_profile_visitor_unique` UNIQUE (profile_id, visitor_user_id); `message_conversations_visitor_recent_idx` (visitor_user_id, last_message_at); `message_conversations_owner_recent_idx` (owner_user_id, last_message_at).

### message_messages

Exportación: `messageMessages` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `conversation_id:text` obligatorio; `sender_user_id:text`; `sender_role:text` obligatorio {`visitor`, `owner`}; `body:text` obligatorio; `read_at:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `conversation_id` → `message_conversations(id)` (delete cascade); `sender_user_id` → `users(id)` (delete set null).

**Índices del esquema:** `message_messages_conversation_created_idx` (conversation_id, created_at); `message_messages_unread_idx` (conversation_id, read_at, sender_role).

### moderation_email_jobs

Exportación: `moderationEmailJobs` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `profile_id:text` obligatorio; `kind:text` obligatorio; `state:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado; `finished_at:text`.

**Relaciones:** `profile_id` → `profiles(id)` (delete cascade).

**Índices del esquema:** `moderation_email_jobs_pending_idx` (state, created_at).

### news_media

Exportación: `newsMedia` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `r2_key:text` obligatorio; `byte_size:integer` obligatorio predeterminado; `content_type:text` obligatorio; `uploaded_by:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `uploaded_by` → `users(id)` (delete restrict).

### news_posts

Exportación: `newsPosts` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `author_id:text` obligatorio; `title:text` obligatorio; `slug:text` obligatorio; `excerpt:text` obligatorio predeterminado; `content_html:text` obligatorio; `cover_media_id:text`; `status:text` obligatorio predeterminado {`draft`, `published`}; `seo_title:text`; `meta_description:text`; `focus_keyword:text`; `canonical_url:text`; `og_title:text`; `og_description:text`; `noindex:integer` obligatorio predeterminado; `published_at:text`; `updated_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `author_id` → `users(id)` (delete restrict); `cover_media_id` → `news_media(id)` (delete set null).

**Índices del esquema:** `news_posts_public_idx` (status, published_at, created_at).

### operational_events

Exportación: `operationalEvents` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `category:text` obligatorio {`email`, `authentication`, `application`, `storage`, `audit`, `telegram`}; `event_name:text` obligatorio; `outcome:text` obligatorio {`success`, `failure`}; `duration_ms:integer`; `detail:text`; `metadata:text`; `created_at:text` obligatorio predeterminado.

**Índices del esquema:** `operational_events_created_idx` (created_at); `operational_events_category_created_idx` (category, created_at); `operational_events_outcome_created_idx` (outcome, created_at).

### operational_storage_snapshots

Exportación: `operationalStorageSnapshots` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `status:text` obligatorio {`complete`, `partial`, `failure`}; `d1_used_bytes:integer`; `d1_allocated_bytes:integer`; `r2_object_count:integer`; `r2_bytes:integer`; `referenced_object_count:integer`; `orphan_object_count:integer`; `orphan_bytes:integer`; `missing_object_count:integer`; `scan_duration_ms:integer`; `scanned_by:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `scanned_by` → `users(id)` (delete set null).

**Índices del esquema:** `operational_storage_created_idx` (created_at).

### portal_whatsapp_events

Exportación: `portalWhatsappEvents` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `recorded_on:text` obligatorio; `contact_id:text` obligatorio; `contact_label:text` obligatorio; `action:text` obligatorio {`panel_open`, `contact_click`}; `placement:text` obligatorio {`floating`, `header`, `footer`, `contact`, `about`, `registration`}; `hits:integer` obligatorio predeterminado.

**Índices del esquema:** `portal_whatsapp_events_day_idx` (recorded_on).

### private_profile_samples

Desde la revisión del 28 de octubre, el listado usa `created_by` para mostrar y filtrar al creador por su identidad administrativa. El ID de usuario es estable aunque cambie el login de GitHub. La lista de opciones cruza concesiones activas/capacidades con autores históricos, sin modificar roles, datos ni estructura SQL.

Exportación: `privateProfileSamples` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK obligatorio; `display_name:text` obligatorio; `form_json:text` obligatorio; `handle:text`; `provenance:text` obligatorio predeterminado {`sexosur`, `publiescort`, `relaxchile`, `elsilencio`, `otros`}; `revision:integer` obligatorio predeterminado; `token_hash:text`; `token_encrypted:text`; `legacy_token_hash:text`; `expires_at:integer` obligatorio; `trashed_at:integer`; `trashed_by:text`; `trash_reason:text` {`manual`, `expired`}; `contacted_at:text`; `contacted_by:text`; `contacted_by_login:text`; `created_by:text` obligatorio; `migrated_profile_id:text`; `migrated_at:text`; `created_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `trashed_by` → `users(id)` (delete set null); `contacted_by` → `users(id)` (delete set null); `created_by` → `users(id)`; `migrated_profile_id` → `profiles(id)` (delete set null).

**Índices del esquema:** `private_profile_samples_updated` (updated_at); `private_profile_samples_expiry` (expires_at).

### private_sample_media

Exportación: `privateSampleMedia` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `sample_id:text` obligatorio; `r2_key:text` obligatorio; `byte_size:integer` obligatorio; `content_type:text` obligatorio; `media_type:text` obligatorio {`image`, `video`}; `is_profile_photo:integer` obligatorio predeterminado; `sort_order:integer` obligatorio predeterminado.

**Relaciones:** `sample_id` → `private_profile_samples(id)` (delete cascade).

**Índices del esquema:** `private_sample_media_parent` (sample_id, sort_order).

### profile_city_alerts

Exportación: `profileCityAlerts` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `profile_id:text` obligatorio; `user_id:text` obligatorio; `city:text` obligatorio; `notified_at:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `profile_id` → `profiles(id)` (delete cascade); `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `profile_city_alert_unique` UNIQUE (profile_id, user_id, city); `profile_city_alert_destination_idx` (profile_id, city, notified_at); `profile_city_alert_user_idx` (user_id, notified_at).

### profile_contact_events

Exportación: `profileContactEvents` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `profile_id:text` obligatorio; `viewer_key:text` obligatorio; `viewer_user_id:text`; `kind:text` obligatorio {`whatsapp`, `telegram`, `call`, `email`, `instagram`, `arsmate`, `onlyfans`, `videocall`}; `clicked_on:text` obligatorio; `click_count:integer` obligatorio predeterminado; `country_code:text`; `region:text`; `city:text`; `device_type:text` obligatorio predeterminado {`mobile`, `tablet`, `desktop`, `unknown`}; `referrer_path:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `profile_id` → `profiles(id)` (delete cascade); `viewer_user_id` → `users(id)` (delete set null).

**Índices del esquema:** `profile_contact_event_daily_unique` UNIQUE (profile_id, viewer_key, kind, clicked_on); `profile_contact_events_profile_day_idx` (profile_id, clicked_on); `profile_contact_events_kind_created_idx` (kind, created_at); `profile_contact_events_viewer_user_idx` (viewer_user_id, created_at).

### profile_details

Exportación: `profileDetails` en [schema.ts](../db/schema.ts).

**Columnas:** `profile_id:text` PK; `contact_phone:text`; `contact_email:text`; `reference_location:text`; `schedule:text`; `price_amount:integer`; `currency:text` obligatorio predeterminado; `metadata:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `profile_id` → `profiles(id)` (delete cascade).

### profile_exclusive_access

Exportación: `profileExclusiveAccess` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `profile_id:text` obligatorio; `user_id:text` obligatorio; `granted_by:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `profile_id` → `profiles(id)` (delete cascade); `user_id` → `users(id)` (delete cascade); `granted_by` → `users(id)` (delete cascade).

**Índices del esquema:** `profile_exclusive_access_unique` UNIQUE (profile_id, user_id); `profile_exclusive_access_user_idx` (user_id, profile_id).

### profile_likes

Exportación: `profileLikes` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `profile_id:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade); `profile_id` → `profiles(id)` (delete cascade).

**Índices del esquema:** `profile_like_unique` UNIQUE (user_id, profile_id).

### profile_media

Exportación: `profileMedia` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `profile_id:text` obligatorio; `media_type:text` obligatorio {`image`, `video`}; `r2_key:text` obligatorio; `byte_size:integer` obligatorio predeterminado; `content_type:text` obligatorio predeterminado; `alt_text:text`; `moderation_status:text` obligatorio predeterminado {`pending`, `approved`, `rejected`}; `visibility:text` obligatorio predeterminado {`public`, `exclusive`}; `is_profile_photo:integer` obligatorio predeterminado; `sort_order:integer` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `profile_id` → `profiles(id)` (delete cascade).

**Índices del esquema:** `profile_media_profile_idx` (profile_id, sort_order); `profile_media_pending_review_idx` (profile_id); `profile_media_public_cover_idx` (profile_id, [SQL], sort_order, id).

La reordenación de galería usa `sort_order` existente, por tipo de archivo y sin mover la principal ni medios exclusivos. Una foto pendiente y su base aprobada reciben la misma posición para conservarla al aprobar o cancelar el reemplazo. No requiere migración ni modifica sus objetos R2.

### profile_report_evidence

Exportación: `profileReportEvidence` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `report_id:text` obligatorio; `r2_key:text` obligatorio; `byte_size:integer` obligatorio predeterminado; `content_type:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `report_id` → `profile_reports(id)` (delete cascade).

**Índices del esquema:** `profile_report_evidence_report_idx` (report_id, created_at).

### profile_reports

Exportación: `profileReports` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `profile_id:text` obligatorio; `reporter_id:text`; `reason:text` obligatorio {`impersonation`, `inappropriate`, `fraud`, `underage`, `wrong_information`, `other`}; `body:text` obligatorio; `status:text` obligatorio predeterminado {`pending`, `reviewed`, `resolved`, `dismissed`}; `admin_note:text`; `updated_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `profile_id` → `profiles(id)` (delete cascade); `reporter_id` → `users(id)` (delete set null).

**Índices del esquema:** `profile_reports_status_created_idx` (status, created_at); `profile_reports_profile_idx` (profile_id, created_at).

### profile_services

Exportación: `profileServices` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `profile_id:text` obligatorio; `kind:text` obligatorio {`included`, `additional`}; `service:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `profile_id` → `profiles(id)` (delete cascade).

**Índices del esquema:** `profile_service_unique` UNIQUE (profile_id, kind, service); `profile_services_service_idx` (service, kind).

### profile_statuses

Exportación: `profileStatuses` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `profile_id:text` obligatorio; `body:text` obligatorio; `story_type:text` obligatorio predeterminado {`text`, `image`, `video`}; `r2_key:text`; `content_type:text`; `byte_size:integer` obligatorio predeterminado; `expires_at:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `profile_id` → `profiles(id)` (delete cascade).

### profile_tags

Exportación: `profileTags` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `profile_id:text` obligatorio; `tag:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `profile_id` → `profiles(id)` (delete cascade).

**Índices del esquema:** `profile_tag_unique` UNIQUE (profile_id, tag).

### profile_verification_files

Exportación: `profileVerificationFiles` en [schema.ts](../db/schema.ts).

**Columnas:** `retention_expires_at:text`; `id:text` PK; `profile_id:text` obligatorio; `kind:text` obligatorio {`identity`, `medical`}; `r2_key:text` obligatorio; `byte_size:integer` obligatorio predeterminado; `content_type:text` obligatorio; `created_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `profile_id` → `profiles(id)` (delete cascade).

**Índices del esquema:** `profile_verification_file_unique` UNIQUE (profile_id, kind); `profile_verification_retention_idx` (retention_expires_at).

### profile_views

Exportación: `profileViews` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `profile_id:text` obligatorio; `viewer_key:text` obligatorio; `viewed_on:text` obligatorio; `viewed_at:text` obligatorio predeterminado.

**Relaciones:** `profile_id` → `profiles(id)` (delete cascade).

**Índices del esquema:** `profile_view_daily_unique` UNIQUE (profile_id, viewer_key, viewed_on); `profile_views_profile_day_idx` (profile_id, viewed_on); `profile_views_profile_timestamp_idx` (profile_id, viewed_at).

### profiles

Exportación: `profiles` en [schema.ts](../db/schema.ts).

**Columnas:** `revision:integer` obligatorio predeterminado; `id:text` PK obligatorio; `owner_id:text` obligatorio; `creation_source:text` obligatorio predeterminado {`self`, `admin`, `unknown`}; `created_by_admin_id:text`; `created_by_admin_login:text`; `admin_escort_limit_override:integer` obligatorio predeterminado; `type:text` obligatorio {`escort`, `agency`, `rental`}; `status:text` obligatorio predeterminado {`draft`, `pending`, `approved`, `paused`, `rejected`, `expired`}; `slug:text` obligatorio; `handle:text`; `display_name:text` obligatorio; `short_description:text` obligatorio predeterminado; `description:text` obligatorio predeterminado; `region:text` obligatorio; `city:text` obligatorio; `comuna:text`; `contact_whatsapp:text`; `contact_telegram:text`; `tier:text` obligatorio predeterminado {`bronze`, `premium`, `vip`}; `verification_status:text` obligatorio predeterminado {`unreviewed`, `in_review`, `reviewed`}; `verified_at:text`; `health_review_status:text` obligatorio predeterminado {`not_requested`, `in_review`, `reviewed`}; `is_featured:integer` obligatorio predeterminado; `is_demo:integer` obligatorio predeterminado; `owner_hidden_at:text`; `trashed_at:text`; `trashed_by_kind:text` {`self`, `admin`, `email_verification`}; `trashed_by_actor_id:text`; `trashed_by_admin_login:text`; `created_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `owner_id` → `users(id)`.

**Índices del esquema:** `profiles_status_region_city_idx` (status, region, city); `profiles_city_public_candidates_idx` (city, status, is_demo); `profiles_public_directory_page_idx` (type, tier, is_featured, updated_at, id); `profiles_owner_idx` (owner_id); `profiles_trash_date_idx` (trashed_at); `profiles_handle_unique` UNIQUE (handle).

### review_reservations

Exportación: `reviewReservations` en [schema.ts](../db/schema.ts).

**Columnas:** `resource_key:text` PK; `actor_id:text` obligatorio; `token:text` obligatorio; `expires_at:integer` obligatorio.

**Relaciones:** `actor_id` → `users(id)` (delete cascade).

**Índices del esquema:** `review_reservations_expiry_idx` (expires_at).

### reviews

Exportación: `reviews` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `author_id:text` obligatorio; `profile_id:text` obligatorio; `body:text` obligatorio; `status:text` obligatorio predeterminado {`pending`, `approved`, `rejected`, `withdrawn`, `removed`}; `created_at:text` obligatorio predeterminado.

**Relaciones:** `author_id` → `users(id)` (delete cascade); `profile_id` → `profiles(id)` (delete cascade).

**Índices del esquema:** `reviews_profile_status_idx` (profile_id, status); `reviews_author_created_idx` (author_id, created_at).

### settings_revision

Exportación: `settingsRevision` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `revision:integer` obligatorio predeterminado.

### site_settings

Exportación: `siteSettings` en [schema.ts](../db/schema.ts).

**Columnas:** `key:text` PK; `value:text` obligatorio; `updated_by:text`; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `updated_by` → `users(id)` (delete set null).

### sponsor_groups

Exportación: `sponsorGroups` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `name:text` obligatorio; `slug:text` obligatorio; `description:text` obligatorio predeterminado; `sort_order:integer` obligatorio predeterminado; `is_active:integer` obligatorio predeterminado; `created_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Índices del esquema:** `sponsor_groups_slug_unique` UNIQUE (slug); `sponsor_groups_active_order_idx` (is_active, sort_order).

### sponsors

Exportación: `sponsors` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `group_id:text` obligatorio; `name:text` obligatorio; `headline:text` obligatorio predeterminado; `subtitle:text` obligatorio predeterminado; `destination_url:text` obligatorio; `cta_label:text` obligatorio predeterminado; `image_alt:text` obligatorio; `display_mode:text` obligatorio predeterminado {`overlay`, `image`, `brand`}; `background_r2_key:text` obligatorio; `background_content_type:text` obligatorio predeterminado; `background_byte_size:integer` obligatorio predeterminado; `logo_r2_key:text`; `logo_content_type:text`; `logo_byte_size:integer` obligatorio predeterminado; `sort_order:integer` obligatorio predeterminado; `is_active:integer` obligatorio predeterminado; `is_sponsored:integer` obligatorio predeterminado; `created_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `group_id` → `sponsor_groups(id)` (delete restrict).

**Índices del esquema:** `sponsors_group_active_order_idx` (group_id, is_active, sort_order).

### telegram_account_links

Exportación: `telegramAccountLinks` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `telegram_user_id:text` obligatorio; `username:text`; `first_name:text`; `status:text` obligatorio predeterminado {`linked`, `revoked`, `banned`}; `linked_at:text` obligatorio predeterminado; `revoked_at:text`; `revoke_reason:text`; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `telegram_account_links_user_unique` UNIQUE (user_id); `telegram_account_links_telegram_unique` UNIQUE (telegram_user_id); `telegram_account_links_status_idx` (status, updated_at).

### telegram_admin_identities

Exportación: `telegramAdminIdentities` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `telegram_user_id:text` obligatorio; `username:text`; `first_name:text`; `is_active:integer` obligatorio predeterminado; `linked_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `telegram_admin_identities_user_unique` UNIQUE (user_id); `telegram_admin_identities_telegram_unique` UNIQUE (telegram_user_id).

### telegram_audit_events

Exportación: `telegramAuditEvents` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `actor_type:text` obligatorio {`admin`, `telegram_admin`, `account`, `bot`, `system`}; `actor_user_id:text`; `actor_telegram_user_id:text`; `action:text` obligatorio; `outcome:text` obligatorio predeterminado {`success`, `failure`}; `entity_type:text` obligatorio; `entity_id:text`; `summary:text` obligatorio; `metadata:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `actor_user_id` → `users(id)` (delete set null).

**Índices del esquema:** `telegram_audit_events_created_idx` (created_at); `telegram_audit_events_action_created_idx` (action, created_at); `telegram_audit_events_actor_created_idx` (actor_user_id, created_at).

### telegram_bulletins

Exportación: `telegramBulletins` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `title:text` obligatorio; `body:text` obligatorio; `source:text` obligatorio {`web`, `telegram`}; `status:text` obligatorio predeterminado {`draft`, `published`, `archived`}; `author_user_id:text`; `source_telegram_chat_id:text`; `source_telegram_message_id:text`; `published_at:text`; `updated_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `author_user_id` → `users(id)` (delete set null).

**Índices del esquema:** `telegram_bulletins_public_idx` (status, published_at, created_at); `telegram_bulletins_source_message_unique` UNIQUE (source_telegram_chat_id, source_telegram_message_id).

### telegram_chats

Exportación: `telegramChats` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `telegram_chat_id:text` obligatorio; `role:text` obligatorio predeterminado {`unassigned`, `public`, `members`}; `title:text` obligatorio predeterminado; `username:text`; `chat_type:text` obligatorio predeterminado; `is_forum:integer` obligatorio predeterminado; `updates_thread_id:text`; `bot_is_administrator:integer` obligatorio predeterminado; `is_active:integer` obligatorio predeterminado; `last_seen_at:text` obligatorio predeterminado; `updated_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Índices del esquema:** `telegram_chats_telegram_unique` UNIQUE (telegram_chat_id); `telegram_chats_role_active_idx` (role, is_active).

### telegram_configuration

Exportación: `telegramConfiguration` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `bot_username:text` obligatorio predeterminado; `public_community_url:text` obligatorio predeterminado; `rules_text:text` obligatorio predeterminado; `prohibited_terms:text` obligatorio predeterminado; `moderation_enabled:integer` obligatorio predeterminado; `auto_ban_enabled:integer` obligatorio predeterminado; `flood_max_messages:integer` obligatorio predeterminado; `flood_window_seconds:integer` obligatorio predeterminado; `duplicate_window_seconds:integer` obligatorio predeterminado; `max_links_per_message:integer` obligatorio predeterminado; `strike_ban_threshold:integer` obligatorio predeterminado; `temporary_restriction_minutes:integer` obligatorio predeterminado; `updated_by:text`; `updated_at:text` obligatorio predeterminado.

**Relaciones:** `updated_by` → `users(id)` (delete set null).

### telegram_link_attempts

Exportación: `telegramLinkAttempts` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `subject_type:text` obligatorio {`account`, `admin`}; `token_hash:text` obligatorio; `status:text` obligatorio predeterminado {`pending`, `candidate`, `confirmed`, `cancelled`, `expired`}; `candidate_telegram_user_id:text`; `candidate_username:text`; `candidate_first_name:text`; `expires_at:text` obligatorio; `candidate_at:text`; `confirmed_at:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `telegram_link_attempts_token_unique` UNIQUE (token_hash); `telegram_link_attempts_user_status_idx` (user_id, status, expires_at).

### telegram_memberships

Exportación: `telegramMemberships` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text` obligatorio; `link_id:text` obligatorio; `telegram_user_id:text` obligatorio; `telegram_chat_id:text` obligatorio; `status:text` obligatorio predeterminado {`pending`, `active`, `left`, `revoked`, `banned`}; `joined_at:text`; `left_at:text`; `updated_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade); `link_id` → `telegram_account_links(id)` (delete cascade).

**Índices del esquema:** `telegram_memberships_user_chat_unique` UNIQUE (user_id, telegram_chat_id); `telegram_memberships_telegram_chat_unique` UNIQUE (telegram_user_id, telegram_chat_id); `telegram_memberships_status_idx` (status, updated_at).

### telegram_message_events

Exportación: `telegramMessageEvents` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `telegram_chat_id:text` obligatorio; `telegram_message_id:text` obligatorio; `telegram_user_id:text` obligatorio; `body_hash:text` obligatorio; `link_count:integer` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Índices del esquema:** `telegram_message_events_message_unique` UNIQUE (telegram_chat_id, telegram_message_id); `telegram_message_events_user_created_idx` (telegram_chat_id, telegram_user_id, created_at); `telegram_message_events_hash_created_idx` (telegram_chat_id, telegram_user_id, body_hash, created_at).

### telegram_moderation_cases

Exportación: `telegramModerationCases` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `user_id:text`; `telegram_user_id:text` obligatorio; `telegram_username:text`; `telegram_chat_id:text` obligatorio; `telegram_message_id:text`; `rule_code:text` obligatorio; `reason:text` obligatorio; `evidence_snippet:text`; `severity:text` obligatorio {`low`, `medium`, `high`, `critical`}; `action:text` obligatorio {`observed`, `warn`, `delete`, `restrict`, `ban`, `unban`}; `status:text` obligatorio predeterminado {`open`, `resolved`, `dismissed`}; `automated:integer` obligatorio predeterminado; `actor_user_id:text`; `actor_telegram_user_id:text`; `restriction_ends_at:text`; `resolved_at:text`; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete set null); `actor_user_id` → `users(id)` (delete set null).

**Índices del esquema:** `telegram_moderation_cases_status_created_idx` (status, created_at); `telegram_moderation_cases_user_created_idx` (telegram_user_id, created_at); `telegram_moderation_cases_chat_created_idx` (telegram_chat_id, created_at).

### telegram_outbox_jobs

Exportación: `telegramOutboxJobs` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `kind:text` obligatorio {`publish_bulletin`, `edit_bulletin`, `delete_bulletin`, `send_member_invite`, `revoke_member`, `ban_member`, `unban_member`, `notify_admin`}; `user_id:text`; `entity_id:text`; `payload:text` obligatorio; `status:text` obligatorio predeterminado {`pending`, `processing`, `succeeded`, `failed`}; `attempts:integer` obligatorio predeterminado; `available_at:text` obligatorio predeterminado; `last_error:text`; `completed_at:text`; `updated_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete set null).

**Índices del esquema:** `telegram_outbox_jobs_status_available_idx` (status, available_at); `telegram_outbox_jobs_user_idx` (user_id, created_at).

### telegram_publications

Exportación: `telegramPublications` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `bulletin_id:text` obligatorio; `telegram_chat_id:text` obligatorio; `telegram_thread_id:text`; `telegram_message_id:text`; `status:text` obligatorio predeterminado {`pending`, `published`, `failed`, `deleted`}; `last_error:text`; `published_at:text`; `updated_at:text` obligatorio predeterminado; `created_at:text` obligatorio predeterminado.

**Relaciones:** `bulletin_id` → `telegram_bulletins(id)` (delete cascade).

**Índices del esquema:** `telegram_publications_bulletin_chat_unique` UNIQUE (bulletin_id, telegram_chat_id); `telegram_publications_message_unique` UNIQUE (telegram_chat_id, telegram_message_id); `telegram_publications_status_idx` (status, updated_at).

### telegram_webhook_updates

Exportación: `telegramWebhookUpdates` en [schema.ts](../db/schema.ts).

**Columnas:** `update_id:text` PK; `update_type:text` obligatorio; `payload:text` obligatorio; `status:text` obligatorio predeterminado {`pending`, `processing`, `processed`, `failed`}; `attempts:integer` obligatorio predeterminado; `last_error:text`; `processed_at:text`; `received_at:text` obligatorio predeterminado.

**Índices del esquema:** `telegram_webhook_updates_status_idx` (status, received_at).

### users

Exportación: `users` en [schema.ts](../db/schema.ts).

**Columnas:** `revision:integer` obligatorio predeterminado; `id:text` PK; `email:text` obligatorio; `username:text`; `password_hash:text`; `display_name:text`; `first_name:text`; `last_name:text`; `document_type:text` obligatorio predeterminado {`rut`, `foreign`}; `document_number:text` obligatorio predeterminado; `foreign_country:text` obligatorio predeterminado; `birth_date:text` obligatorio predeterminado; `city:text` obligatorio predeterminado; `phone:text`; `is_active:integer` obligatorio predeterminado; `self_disabled_at:text`; `admin_disabled_at:text`; `role:text` obligatorio predeterminado {`visitor`, `advertiser`, `tester`, `admin`}; `creation_source:text` obligatorio predeterminado {`self`, `admin`, `unknown`}; `created_by_admin_id:text`; `created_by_admin_login:text`; `email_verified_at:text`; `registration_auth_method:text` obligatorio predeterminado {`password`, `google`, `apple`, `x`, `unknown`}; `email_verification_deadline:text`; `email_verification_blocked_at:text`; `email_verification_exempt_at:text`; `email_verification_exempt_by:text`; `email_verification_exempt_reason:text`; `email_verification_notice_at:text`; `email_verification_notice_attempt_at:text`; `email_verification_last_sent_at:text`; `created_at:text` obligatorio predeterminado.

**Índices del esquema:** `users_username_unique` UNIQUE (username); `users_email_verification_due_idx` (email_verification_deadline).

### x_auth_attempts

Exportación: `xAuthAttempts` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `state_hash:text` obligatorio; `browser_hash:text` obligatorio; `code_verifier:text` obligatorio; `intent:text` obligatorio {`login`, `register`, `link`}; `user_id:text`; `return_to:text` obligatorio; `expires_at:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Relaciones:** `user_id` → `users(id)` (delete cascade).

**Índices del esquema:** `x_auth_attempts_expiry_idx` (expires_at).

### x_registration_intents

Exportación: `xRegistrationIntents` en [schema.ts](../db/schema.ts).

**Columnas:** `id:text` PK; `token_hash:text` obligatorio; `x_subject:text` obligatorio; `x_username:text` obligatorio; `email:text`; `display_name:text` obligatorio; `expires_at:text` obligatorio; `created_at:text` obligatorio predeterminado.

**Índices del esquema:** `x_registration_intents_expiry_idx` (expires_at).

## Contratos que además viven en migraciones

- `0039_scoped_escort_exception.sql`: límite de un Escort fuera de papelera, con excepción de identidad controlada por servidor. No copiar sus datos de identidad a esta guía.
- `0045_help_and_session_isolation.sql` y `0046_same_origin_apple_completion.sql`: identidad pública/administrativa y conflictos de proveedores.
- `0056_admin_collaboration.sql`: revisiones, guardas e invalidación ante cambios de colecciones/configuración.
- `0057_legal_documents_and_city_popularity.sql`: documentos legales y revisión de versiones.
- `0065_legal_privacy_revision.sql`: archivo del texto canónico `2026.10.14.3`, de la publicación de Privacidad `2026.10.17.1` expresamente revisada, y revisión `2026.10.26.1` en las tablas legales existentes; guarda de versión y contenido, borradores y personalizaciones preservados, incremento de revisión mediante el trigger existente. La tabla auxiliar se crea y elimina en la propia migración; no cambia `account_legal_acceptances`.
- `0059_reversible_photo_edits_and_mutation_receipts.sql`, `0060_profile_storage_cleanup.sql` y `0061_no_additional_photo_bases.sql`: edición de fotos y limpieza de referencias a objetos.
- `0062_private_profile_samples.sql`: muestras privadas y revisiones de sus medios.
- `0063_incompatible_profile_tags.sql`: incompatibilidad MILF con Hombres/Trans. La derivación de Hombres desde Masculino vive también en `lib/profile-tag-policy.ts` y `lib/profile-submission.ts`.

Los triggers pueden incrementar revisiones al insertar o eliminar relaciones. Una actualización de tags o medios debe usar la versión del recurso, no asumir que cambiar una tabla secundaria no altera el anuncio.

## Muestras y autorización administrativa — 25 de octubre de 2026

`0064_private_sample_workflow.sql` añade usuario privado estable, token cifrado y hash heredado, procedencia, papelera y seguimiento manual de contacto. El trigger de cambios de medios invalida revisiones antiguas. `profiles.admin_escort_limit_override` permite un Escort adicional confirmado por administración sin abrir el cupo normal de la cuenta; los triggers siguen bloqueando duplicados ordinarios y transferencias que arrastren la excepción. La aplicación valida la cuenta, revisión y cantidad de Escort en la misma transacción de conversión. No se guardan tokens en texto plano ni se indexan muestras.
