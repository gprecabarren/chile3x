CREATE TABLE `telegram_account_links` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`telegram_user_id` text NOT NULL,
	`username` text,
	`first_name` text,
	`status` text DEFAULT 'linked' NOT NULL,
	`linked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text,
	`revoke_reason` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_account_links_user_unique` ON `telegram_account_links` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_account_links_telegram_unique` ON `telegram_account_links` (`telegram_user_id`);--> statement-breakpoint
CREATE INDEX `telegram_account_links_status_idx` ON `telegram_account_links` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `telegram_admin_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`telegram_user_id` text NOT NULL,
	`username` text,
	`first_name` text,
	`is_active` integer DEFAULT true NOT NULL,
	`linked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_admin_identities_user_unique` ON `telegram_admin_identities` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_admin_identities_telegram_unique` ON `telegram_admin_identities` (`telegram_user_id`);--> statement-breakpoint
CREATE TABLE `telegram_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_type` text NOT NULL,
	`actor_user_id` text,
	`actor_telegram_user_id` text,
	`action` text NOT NULL,
	`outcome` text DEFAULT 'success' NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`summary` text NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `telegram_audit_events_created_idx` ON `telegram_audit_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `telegram_audit_events_action_created_idx` ON `telegram_audit_events` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `telegram_audit_events_actor_created_idx` ON `telegram_audit_events` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `telegram_bulletins` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`author_user_id` text,
	`source_telegram_chat_id` text,
	`source_telegram_message_id` text,
	`published_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `telegram_bulletins_public_idx` ON `telegram_bulletins` (`status`,`published_at`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_bulletins_source_message_unique` ON `telegram_bulletins` (`source_telegram_chat_id`,`source_telegram_message_id`);--> statement-breakpoint
CREATE TABLE `telegram_chats` (
	`id` text PRIMARY KEY NOT NULL,
	`telegram_chat_id` text NOT NULL,
	`role` text DEFAULT 'unassigned' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`username` text,
	`chat_type` text DEFAULT 'supergroup' NOT NULL,
	`is_forum` integer DEFAULT false NOT NULL,
	`updates_thread_id` text,
	`bot_is_administrator` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_chats_telegram_unique` ON `telegram_chats` (`telegram_chat_id`);--> statement-breakpoint
CREATE INDEX `telegram_chats_role_active_idx` ON `telegram_chats` (`role`,`is_active`);--> statement-breakpoint
CREATE TABLE `telegram_configuration` (
	`id` text PRIMARY KEY NOT NULL,
	`bot_username` text DEFAULT '' NOT NULL,
	`public_community_url` text DEFAULT '' NOT NULL,
	`rules_text` text DEFAULT '' NOT NULL,
	`prohibited_terms` text DEFAULT '' NOT NULL,
	`moderation_enabled` integer DEFAULT true NOT NULL,
	`auto_ban_enabled` integer DEFAULT true NOT NULL,
	`flood_max_messages` integer DEFAULT 8 NOT NULL,
	`flood_window_seconds` integer DEFAULT 20 NOT NULL,
	`duplicate_window_seconds` integer DEFAULT 90 NOT NULL,
	`max_links_per_message` integer DEFAULT 2 NOT NULL,
	`strike_ban_threshold` integer DEFAULT 3 NOT NULL,
	`temporary_restriction_minutes` integer DEFAULT 1440 NOT NULL,
	`updated_by` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `telegram_link_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject_type` text NOT NULL,
	`token_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`candidate_telegram_user_id` text,
	`candidate_username` text,
	`candidate_first_name` text,
	`expires_at` text NOT NULL,
	`candidate_at` text,
	`confirmed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_link_attempts_token_unique` ON `telegram_link_attempts` (`token_hash`);--> statement-breakpoint
CREATE INDEX `telegram_link_attempts_user_status_idx` ON `telegram_link_attempts` (`user_id`,`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `telegram_message_events` (
	`id` text PRIMARY KEY NOT NULL,
	`telegram_chat_id` text NOT NULL,
	`telegram_message_id` text NOT NULL,
	`telegram_user_id` text NOT NULL,
	`body_hash` text NOT NULL,
	`link_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_message_events_message_unique` ON `telegram_message_events` (`telegram_chat_id`,`telegram_message_id`);--> statement-breakpoint
CREATE INDEX `telegram_message_events_user_created_idx` ON `telegram_message_events` (`telegram_chat_id`,`telegram_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `telegram_message_events_hash_created_idx` ON `telegram_message_events` (`telegram_chat_id`,`telegram_user_id`,`body_hash`,`created_at`);--> statement-breakpoint
CREATE TABLE `telegram_moderation_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`telegram_user_id` text NOT NULL,
	`telegram_username` text,
	`telegram_chat_id` text NOT NULL,
	`telegram_message_id` text,
	`rule_code` text NOT NULL,
	`reason` text NOT NULL,
	`evidence_snippet` text,
	`severity` text NOT NULL,
	`action` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`automated` integer DEFAULT false NOT NULL,
	`actor_user_id` text,
	`actor_telegram_user_id` text,
	`restriction_ends_at` text,
	`resolved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `telegram_moderation_cases_status_created_idx` ON `telegram_moderation_cases` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `telegram_moderation_cases_user_created_idx` ON `telegram_moderation_cases` (`telegram_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `telegram_moderation_cases_chat_created_idx` ON `telegram_moderation_cases` (`telegram_chat_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `telegram_outbox_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`user_id` text,
	`entity_id` text,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`available_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_error` text,
	`completed_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `telegram_outbox_jobs_status_available_idx` ON `telegram_outbox_jobs` (`status`,`available_at`);--> statement-breakpoint
CREATE INDEX `telegram_outbox_jobs_user_idx` ON `telegram_outbox_jobs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `telegram_publications` (
	`id` text PRIMARY KEY NOT NULL,
	`bulletin_id` text NOT NULL,
	`telegram_chat_id` text NOT NULL,
	`telegram_thread_id` text,
	`telegram_message_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`last_error` text,
	`published_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`bulletin_id`) REFERENCES `telegram_bulletins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_publications_bulletin_chat_unique` ON `telegram_publications` (`bulletin_id`,`telegram_chat_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_publications_message_unique` ON `telegram_publications` (`telegram_chat_id`,`telegram_message_id`);--> statement-breakpoint
CREATE INDEX `telegram_publications_status_idx` ON `telegram_publications` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `telegram_webhook_updates` (
	`update_id` text PRIMARY KEY NOT NULL,
	`update_type` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`processed_at` text,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `telegram_webhook_updates_status_idx` ON `telegram_webhook_updates` (`status`,`received_at`);
--> statement-breakpoint
INSERT OR IGNORE INTO `telegram_configuration` (
	`id`,
	`rules_text`,
	`moderation_enabled`,
	`auto_ban_enabled`
) VALUES (
	'default',
	'1. Comunidad exclusiva para personas mayores de 18 años.\n2. Trata con respeto a las damas de compañía, visitantes y equipo de moderación.\n3. No se permiten acoso, amenazas, discriminación, suplantación ni difusión de datos privados.\n4. No publiques spam, enlaces engañosos, estafas ni promociones repetitivas.\n5. Nunca compartas contraseñas, códigos de verificación, documentos, datos bancarios ni contenido privado de terceros.\n6. No se coordinan pagos, reservas ni negociaciones a través del bot o de los grupos oficiales.\n7. Está prohibido todo contenido relacionado con menores de edad o actividades ilegales.\n8. Las decisiones automáticas quedan registradas y pueden ser revisadas por el equipo de Chile3X.',
	true,
	true
);
