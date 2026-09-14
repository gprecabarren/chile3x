ALTER TABLE `sponsors` ADD `headline` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `sponsors` SET `headline` = `name` WHERE `headline` = '';
--> statement-breakpoint
INSERT INTO `sponsors` (`id`,`group_id`,`name`,`headline`,`subtitle`,`destination_url`,`cta_label`,`image_alt`,`display_mode`,`background_r2_key`,`background_content_type`,`background_byte_size`,`logo_r2_key`,`logo_content_type`,`logo_byte_size`,`sort_order`,`is_active`,`is_sponsored`,`updated_at`) VALUES
('sponsor_open_adult_directory','sponsor_group_chile','Open Adult Directory','Open Adult Directory','Escorts World Wide','https://openadultdirectory.com/escorts/','Conocer más','Banner oficial de Open Adult Directory','brand','sponsors/imported-2026/open-adult-directory.jpg','image/jpeg',11883,NULL,NULL,0,90,true,false,CURRENT_TIMESTAMP),
('sponsor_angelisnet','sponsor_group_chile','AngelisNET','AngelisNET','Directorio y comunidad internacional para adultos','https://www.angelisnet.com/es/','Conocer más','Logo oficial de AngelisNET','brand','sponsors/imported-2026/angelisnet.png','image/png',8121,NULL,NULL,0,100,true,true,CURRENT_TIMESTAMP),
('sponsor_la_estokada','sponsor_group_chile','Foro La EstoKada','Foro La EstoKada','Comunidad chilena para adultos','https://www.laestokada.cl/foro/','Conocer más','Logo oficial del Foro La EstoKada','brand','sponsors/imported-2026/la-estokada.png','image/png',54278,NULL,NULL,0,110,true,false,CURRENT_TIMESTAMP);
