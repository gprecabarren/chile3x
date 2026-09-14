CREATE TABLE `sponsor_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sponsor_groups_slug_unique` ON `sponsor_groups` (`slug`);--> statement-breakpoint
CREATE INDEX `sponsor_groups_active_order_idx` ON `sponsor_groups` (`is_active`,`sort_order`);--> statement-breakpoint
CREATE TABLE `sponsors` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`name` text NOT NULL,
	`subtitle` text DEFAULT '' NOT NULL,
	`destination_url` text NOT NULL,
	`cta_label` text DEFAULT 'Conocer más' NOT NULL,
	`image_alt` text NOT NULL,
	`display_mode` text DEFAULT 'overlay' NOT NULL,
	`background_r2_key` text NOT NULL,
	`background_content_type` text DEFAULT 'image/jpeg' NOT NULL,
	`background_byte_size` integer DEFAULT 0 NOT NULL,
	`logo_r2_key` text,
	`logo_content_type` text,
	`logo_byte_size` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_sponsored` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `sponsor_groups`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sponsors_background_r2_key_unique` ON `sponsors` (`background_r2_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `sponsors_logo_r2_key_unique` ON `sponsors` (`logo_r2_key`);--> statement-breakpoint
CREATE INDEX `sponsors_group_active_order_idx` ON `sponsors` (`group_id`,`is_active`,`sort_order`);
--> statement-breakpoint
INSERT INTO `sponsor_groups` (`id`,`name`,`slug`,`description`,`sort_order`,`is_active`,`updated_at`) VALUES
('sponsor_group_chile','Selección de sitios asociados','seleccion-chile','Spas, masajes y plataformas asociadas para personas adultas en Chile.',10,true,CURRENT_TIMESTAMP);
--> statement-breakpoint
INSERT INTO `sponsors` (`id`,`group_id`,`name`,`subtitle`,`destination_url`,`cta_label`,`image_alt`,`display_mode`,`background_r2_key`,`background_content_type`,`background_byte_size`,`logo_r2_key`,`logo_content_type`,`logo_byte_size`,`sort_order`,`is_active`,`is_sponsored`,`updated_at`) VALUES
('sponsor_hombres_el_golf','sponsor_group_chile','SPA Hombres El Golf','','https://entremusaselgolf.cl/','Contactar','Sesión de masaje de SPA Hombres El Golf','overlay','sponsors/imported-2026/hombres-el-golf.jpg','image/jpeg',33677,NULL,NULL,0,10,true,false,CURRENT_TIMESTAMP),
('sponsor_templanza','sponsor_group_chile','Templanza Spa','Lujo es sentirte en paz contigo','https://templanzaspa.com/','Conocer más','Sesión de masaje de Templanza Spa','overlay','sponsors/imported-2026/templanza.png','image/png',937400,'sponsors/imported-2026/templanza-logo.png','image/png',2913,20,true,false,CURRENT_TIMESTAMP),
('sponsor_angels_spa','sponsor_group_chile','Angel''s Spa','Damas, caballeros y parejas','https://api.whatsapp.com/send?phone=56932561168&text=Hola%2C%20te%20contacto%20desde%20chile3x.cl','Contactar','Masaje para parejas de Angel''s Spa','overlay','sponsors/imported-2026/angels-spa.png','image/png',818956,'sponsors/imported-2026/angels-spa-logo.png','image/png',25299,30,true,false,CURRENT_TIMESTAMP),
('sponsor_spa_tentacion','sponsor_group_chile','Spa Tentación','Vive una experiencia inolvidable','https://spatentacion.cl/','Contactar','Identidad visual de Spa Tentación','overlay','sponsors/imported-2026/spa-tentacion.webp','image/webp',34474,'sponsors/imported-2026/spa-tentacion-logo.png','image/png',74112,40,true,false,CURRENT_TIMESTAMP),
('sponsor_delicia_intimo','sponsor_group_chile','Delicia Íntimo','','https://deliciaintima.cl/','Contactar','Identidad visual roja y dorada de Delicia Íntimo','image','sponsors/imported-2026/delicia-intimo.jpg','image/jpeg',208891,NULL,NULL,0,50,true,false,CURRENT_TIMESTAMP),
('sponsor_spa_eroticas','sponsor_group_chile','Spa Eróticas','','https://www.spaeroticaslascondes.com/','Contactar','Sesión de masaje de Spa Eróticas','overlay','sponsors/imported-2026/spa-eroticas.jpg','image/jpeg',697823,'sponsors/imported-2026/spa-eroticas-logo.png','image/png',18116,60,true,false,CURRENT_TIMESTAMP),
('sponsor_mansion_masaje','sponsor_group_chile','La Mansión del Masaje','Cumple tus fantasías en La Mansión','https://www.lamansiondelmasaje.cl/','Contactar','Sesión de masaje de La Mansión del Masaje','overlay','sponsors/imported-2026/mansion-masaje.png','image/png',1147443,'sponsors/imported-2026/mansion-masaje-logo.png','image/png',370282,70,true,false,CURRENT_TIMESTAMP),
('sponsor_masajes_imperio','sponsor_group_chile','Masajes Imperio','','https://www.masajesimperio.cl/','Contactar','Identidad visual de Masajes Imperio','overlay','sponsors/imported-2026/masajes-imperio.jpg','image/jpeg',96085,'sponsors/imported-2026/masajes-imperio-logo.jpg','image/jpeg',178989,80,true,false,CURRENT_TIMESTAMP);
