ALTER TABLE `profile_media` ADD `byte_size` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_media` ADD `content_type` text DEFAULT 'image/jpeg' NOT NULL;