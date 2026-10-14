CREATE TABLE `email_delivery_logs` (
 `id` text PRIMARY KEY NOT NULL,
 `user_id` text REFERENCES `users`(`id`) ON DELETE CASCADE,
 `recipient` text NOT NULL,
 `audience` text NOT NULL,
 `kind` text NOT NULL,
 `subject` text NOT NULL,
 `status` text NOT NULL,
 `provider` text,
 `detail` text,
 `attempts` text,
 `duration_ms` integer,
 `finished_at` text,
 `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `email_delivery_created_idx` ON `email_delivery_logs` (`created_at`);
--> statement-breakpoint
CREATE INDEX `email_delivery_recipient_created_idx` ON `email_delivery_logs` (`recipient`,`created_at`);
--> statement-breakpoint
CREATE INDEX `email_delivery_kind_created_idx` ON `email_delivery_logs` (`kind`,`created_at`);
--> statement-breakpoint
CREATE INDEX `email_delivery_status_created_idx` ON `email_delivery_logs` (`status`,`created_at`);
