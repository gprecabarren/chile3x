CREATE TABLE `forum_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`uploaded_by` text,
	`media_type` text NOT NULL,
	`r2_key` text NOT NULL,
	`byte_size` integer NOT NULL,
	`content_type` text NOT NULL,
	`moderation_status` text DEFAULT 'pending' NOT NULL,
	`consent_version` text NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`deleted_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `forum_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `forum_attachments_post_idx` ON `forum_attachments` (`post_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `forum_attachments_moderation_idx` ON `forum_attachments` (`moderation_status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `forum_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`post_id` text,
	`read_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`topic_id`) REFERENCES `forum_topics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `forum_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forum_notification_post_recipient_unique` ON `forum_notifications` (`post_id`,`recipient_id`);--> statement-breakpoint
CREATE INDEX `forum_notifications_recipient_idx` ON `forum_notifications` (`recipient_id`,`read_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `forum_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`hits` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `forum_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`reporter_id` text,
	`reason` text NOT NULL,
	`detail` text NOT NULL,
	`post_version` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution` text,
	`resolved_by` text,
	`resolved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `forum_posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forum_report_post_reporter_unique` ON `forum_reports` (`post_id`,`reporter_id`);--> statement-breakpoint
CREATE INDEX `forum_reports_queue_idx` ON `forum_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `forum_rule_acceptances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`version` text NOT NULL,
	`accepted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forum_acceptance_user_version_unique` ON `forum_rule_acceptances` (`user_id`,`version`);--> statement-breakpoint
CREATE TABLE `forum_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`rules` text NOT NULL,
	`version` text NOT NULL,
	`updated_by` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `forum_watches` (
	`id` text PRIMARY KEY NOT NULL,
	`topic_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`topic_id`) REFERENCES `forum_topics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forum_watch_user_topic_unique` ON `forum_watches` (`user_id`,`topic_id`);--> statement-breakpoint
CREATE INDEX `forum_watches_topic_idx` ON `forum_watches` (`topic_id`);
--> statement-breakpoint
INSERT INTO forum_settings(id,rules,version) VALUES('global','Normas del foro Chile3X · Beta privada

1. Solo pueden participar administradores autorizados. Esta beta no concede acceso a usuarios ni visitantes.
2. Mantenga un trato respetuoso. No publique amenazas, acoso, discriminación ni ataques personales.
3. Publique únicamente información y material propio o con autorización de sus titulares y de todas las personas representadas, que deben ser mayores de 18 años. No se admite contenido de menores, explotación, violencia sexual ni material obtenido sin consentimiento.
4. No publique documentos de identidad, exámenes médicos, contraseñas, direcciones exactas, teléfonos privados ni información identificable de terceros. Los documentos de los anuncios permanecen en sus secciones privadas; nunca deben copiarse al foro.
5. No se admiten spam, phishing, suplantaciones ni enlaces para actividades ilícitas. Distinga opiniones, experiencias y hechos; no atribuya delitos sin fundamento ni presente una publicación como una certificación de Chile3X.
6. Use la sección adecuada, evite duplicados y no publique anuncios comerciales repetidos. Los límites de frecuencia y tamaño se aplican también a administradores.
7. Los adjuntos requieren declaración de consentimiento y revisión manual antes de quedar aprobados. La revisión no prueba por sí sola identidad, legalidad ni ausencia de riesgos.
8. Utilice Reportar en el mensaje afectado para solicitar revisión o rectificación. Las denuncias y sus decisiones solo están disponibles dentro de esta beta administrativa.
9. Administración puede corregir, mover, cerrar o retirar publicaciones con trazabilidad. Los adjuntos retirados, rechazados o asociados a mensajes en papelera se eliminan tras 30 días; hasta entonces pueden recuperarse desde administración.
10. Las notificaciones son internas, no correos automáticos. Se conservan 90 días; las denuncias cerradas, 180 días. Estas normas complementan los Términos y la Política de privacidad del portal.','2026.10.14.1');
