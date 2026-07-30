-- Custom SQL migration file, put your code below! --
-- Datos ficticios y sin contacto activo para revisar el directorio público.
-- Los perfiles están identificados como demostración en la interfaz.
INSERT OR IGNORE INTO `users` (`id`, `email`, `display_name`, `role`) VALUES
  ('usr_demo_munequitas', 'demo-agencia-concepcion@chile3x.invalid', 'Agencia Muñequitas Demo', 'advertiser'),
  ('usr_demo_paola', 'demo-paola@chile3x.invalid', 'Paola Demo', 'advertiser'),
  ('usr_demo_luna', 'demo-luna@chile3x.invalid', 'Luna Demo', 'advertiser'),
  ('usr_demo_casa_brisa', 'demo-arriendo-concepcion@chile3x.invalid', 'Casa Brisa Demo', 'advertiser'),
  ('usr_demo_ambar', 'demo-ambar@chile3x.invalid', 'Ámbar Demo', 'advertiser'),
  ('usr_demo_valentina', 'demo-valentina@chile3x.invalid', 'Valentina Demo', 'advertiser'),
  ('usr_demo_costa', 'demo-agencia-vina@chile3x.invalid', 'Costa Demo', 'advertiser');
--> statement-breakpoint
INSERT OR IGNORE INTO `profiles` (`id`, `owner_id`, `type`, `status`, `slug`, `display_name`, `short_description`, `description`, `region`, `city`, `comuna`, `contact_whatsapp`, `tier`, `verification_status`, `health_review_status`, `is_featured`, `is_demo`) VALUES
  ('prf_demo_munequitas', 'usr_demo_munequitas', 'agency', 'approved', 'agencia-munequitas-concepcion-demo', 'Agencia Muñequitas', 'Agencia de demostración con perfiles asociados mediante consentimiento.', 'Perfil ficticio para probar cómo se muestran las agencias, sus servicios y las escorts que aceptaron aparecer asociadas.', 'Región del Biobío', 'Concepción', 'Centro', '56900000001', 'premium', 'reviewed', 'not_requested', 1, 1),
  ('prf_demo_paola', 'usr_demo_paola', 'escort', 'approved', 'paola-concepcion-demo', 'Paola', 'Perfil de demostración VIP asociado a una agencia con aprobación previa.', 'Perfil ficticio utilizado para revisar tarjetas, filtros por categoría y la visualización de una escort dentro de una agencia.', 'Región del Biobío', 'Concepción', 'Centro', '56900000002', 'vip', 'reviewed', 'reviewed', 1, 1),
  ('prf_demo_luna', 'usr_demo_luna', 'escort', 'approved', 'luna-concepcion-demo', 'Luna', 'Perfil de demostración con etiqueta de masajes y servicios adicionales.', 'Perfil ficticio para probar filtros por servicios incluidos, adicionales y etiquetas complementarias dentro de Concepción.', 'Región del Biobío', 'Concepción', 'Barrio Universitario', '56900000003', 'gold', 'reviewed', 'not_requested', 0, 1),
  ('prf_demo_casa_brisa', 'usr_demo_casa_brisa', 'rental', 'approved', 'casa-brisa-concepcion-demo', 'Casa Brisa', 'Habitación de demostración en Concepción con servicios incluidos.', 'Arriendo ficticio para revisar los atributos propios de una habitación, sus servicios y su tarjeta pública.', 'Región del Biobío', 'Concepción', 'Centro', '56900000004', 'gold', 'reviewed', 'not_requested', 0, 1),
  ('prf_demo_ambar', 'usr_demo_ambar', 'escort', 'approved', 'ambar-providencia-demo', 'Ámbar', 'Perfil de demostración VIP en Providencia.', 'Perfil ficticio para probar resultados por ciudad, nacionalidad, atributos físicos y categoría VIP.', 'Región Metropolitana de Santiago', 'Providencia', 'Providencia', '56900000005', 'vip', 'reviewed', 'not_requested', 1, 1),
  ('prf_demo_valentina', 'usr_demo_valentina', 'escort', 'approved', 'valentina-vina-del-mar-demo', 'Valentina', 'Perfil de demostración Premium en Viña del Mar.', 'Perfil ficticio para revisar SEO local, filtros por categoría Premium y etiqueta MILF.', 'Región de Valparaíso', 'Viña del Mar', 'Poniente', '56900000006', 'premium', 'in_review', 'not_requested', 0, 1),
  ('prf_demo_costa', 'usr_demo_costa', 'agency', 'approved', 'agencia-costa-vina-del-mar-demo', 'Agencia Costa', 'Agencia de demostración disponible en Viña del Mar.', 'Perfil ficticio de agencia para probar resultados por tipo de publicación y ciudad.', 'Región de Valparaíso', 'Viña del Mar', 'Centro', '56900000007', 'gold', 'reviewed', 'not_requested', 0, 1);
--> statement-breakpoint
INSERT OR IGNORE INTO `profile_details` (`profile_id`, `contact_phone`, `contact_email`, `reference_location`, `schedule`, `price_amount`, `currency`, `metadata`) VALUES
  ('prf_demo_munequitas', NULL, 'contacto@munequitas.demo.invalid', 'Ubicación referencial en el centro', 'Lunes a domingo, 10:00 a 22:00', NULL, 'CLP', '{"agency_years":"6","website":"https://munequitas.demo.invalid","promotions":"Información de demostración","contact_methods":"WhatsApp y correo"}'),
  ('prf_demo_paola', NULL, NULL, 'Ubicación referencial en el centro', 'Todos los días, horario coordinado', 90000, 'CLP', '{"artist_name":"Paola","gender":"Trans","age":"29","nationality":"Chilena","skin_color":"Trigueña","languages":"Español, Inglés","height_cm":"170","weight_kg":"62","measurements":"90 - 65 - 95","hair_color":"Negro","body_type":"Curvilínea","bust_size":"Medio"}'),
  ('prf_demo_luna', NULL, NULL, 'Sector universitario', 'Martes a domingo, 12:00 a 21:00', 65000, 'CLP', '{"artist_name":"Luna","gender":"Femenino","age":"27","nationality":"Argentina","skin_color":"Clara","languages":"Español","height_cm":"165","weight_kg":"58","measurements":"88 - 62 - 90","hair_color":"Castaño","body_type":"Atlética","bust_size":"Medio"}'),
  ('prf_demo_casa_brisa', NULL, 'arriendo@casabrisa.demo.invalid', 'Cerca del centro', 'Disponible para coordinar visita', 280000, 'CLP', '{"room_type":"Individual","furnished":"Sí","private_bathroom":"No","exterior_window":"Sí","room_size":"14","common_expenses":"Sí","deposit":"280000","minimum_rental":"Meses","immediate_available":"Sí","wifi":"Sí","utilities_included":"Sí","kitchen":"Sí","laundry":"Sí"}'),
  ('prf_demo_ambar', NULL, NULL, 'Sector Providencia', 'Lunes a sábado, horario coordinado', 120000, 'CLP', '{"artist_name":"Ámbar","gender":"Femenino","age":"31","nationality":"Chilena","skin_color":"Morena","languages":"Español, Inglés","height_cm":"168","weight_kg":"60","measurements":"92 - 64 - 96","hair_color":"Rojo","body_type":"Curvilínea","bust_size":"Grande"}'),
  ('prf_demo_valentina', NULL, NULL, 'Sector poniente', 'Viernes a domingo, horario coordinado', 80000, 'CLP', '{"artist_name":"Valentina","gender":"Femenino","age":"34","nationality":"Peruana","skin_color":"Trigueña","languages":"Español","height_cm":"162","weight_kg":"56","measurements":"86 - 61 - 89","hair_color":"Rubio","body_type":"Delgada","bust_size":"Medio"}'),
  ('prf_demo_costa', NULL, 'contacto@agenciacosta.demo.invalid', 'Ubicación referencial en Viña del Mar', 'Lunes a domingo, 11:00 a 21:00', NULL, 'CLP', '{"agency_years":"4","website":"https://agenciacosta.demo.invalid","promotions":"Información de demostración","contact_methods":"WhatsApp"}');
--> statement-breakpoint
INSERT OR IGNORE INTO `profile_tags` (`id`, `profile_id`, `tag`) VALUES
  ('tag_demo_paola_trans', 'prf_demo_paola', 'trans'),
  ('tag_demo_luna_masajes', 'prf_demo_luna', 'masajes'),
  ('tag_demo_ambar_milf', 'prf_demo_ambar', 'milf'),
  ('tag_demo_valentina_milf', 'prf_demo_valentina', 'milf');
--> statement-breakpoint
INSERT OR IGNORE INTO `profile_services` (`id`, `profile_id`, `kind`, `service`) VALUES
  ('srv_demo_paola_1', 'prf_demo_paola', 'included', 'Departamento propio'),
  ('srv_demo_paola_2', 'prf_demo_paola', 'included', 'Hoteles'),
  ('srv_demo_paola_3', 'prf_demo_paola', 'additional', 'Noche completa'),
  ('srv_demo_paola_4', 'prf_demo_paola', 'additional', 'Viajes'),
  ('srv_demo_luna_1', 'prf_demo_luna', 'included', 'Domicilio'),
  ('srv_demo_luna_2', 'prf_demo_luna', 'included', 'Hoteles'),
  ('srv_demo_luna_3', 'prf_demo_luna', 'additional', 'Traslado'),
  ('srv_demo_brisa_1', 'prf_demo_casa_brisa', 'included', 'Departamento propio'),
  ('srv_demo_brisa_2', 'prf_demo_casa_brisa', 'included', 'Videollamada'),
  ('srv_demo_ambar_1', 'prf_demo_ambar', 'included', 'Departamento propio'),
  ('srv_demo_ambar_2', 'prf_demo_ambar', 'additional', 'Noche completa'),
  ('srv_demo_valentina_1', 'prf_demo_valentina', 'included', 'Hoteles'),
  ('srv_demo_valentina_2', 'prf_demo_valentina', 'additional', 'Traslado'),
  ('srv_demo_munequitas_1', 'prf_demo_munequitas', 'included', 'Hoteles'),
  ('srv_demo_costa_1', 'prf_demo_costa', 'included', 'Departamento propio');
--> statement-breakpoint
INSERT OR IGNORE INTO `listing_periods` (`id`, `profile_id`, `plan_name`, `starts_at`, `ends_at`, `status`) VALUES
  ('per_demo_munequitas', 'prf_demo_munequitas', 'Demostración', '2026-07-30T00:00:00.000Z', '2027-07-30T00:00:00.000Z', 'active'),
  ('per_demo_paola', 'prf_demo_paola', 'Demostración', '2026-07-30T00:00:00.000Z', '2027-07-30T00:00:00.000Z', 'active'),
  ('per_demo_luna', 'prf_demo_luna', 'Demostración', '2026-07-30T00:00:00.000Z', '2027-07-30T00:00:00.000Z', 'active'),
  ('per_demo_brisa', 'prf_demo_casa_brisa', 'Demostración', '2026-07-30T00:00:00.000Z', '2027-07-30T00:00:00.000Z', 'active'),
  ('per_demo_ambar', 'prf_demo_ambar', 'Demostración', '2026-07-30T00:00:00.000Z', '2027-07-30T00:00:00.000Z', 'active'),
  ('per_demo_valentina', 'prf_demo_valentina', 'Demostración', '2026-07-30T00:00:00.000Z', '2027-07-30T00:00:00.000Z', 'active'),
  ('per_demo_costa', 'prf_demo_costa', 'Demostración', '2026-07-30T00:00:00.000Z', '2027-07-30T00:00:00.000Z', 'active');
--> statement-breakpoint
INSERT OR IGNORE INTO `agency_membership_requests` (`id`, `agency_profile_id`, `escort_profile_id`, `requested_by`, `status`, `message`, `responded_at`) VALUES
  ('amr_demo_munequitas_paola', 'prf_demo_munequitas', 'prf_demo_paola', 'usr_demo_munequitas', 'accepted', 'Invitación de demostración aceptada por la escort.', '2026-07-30T00:00:00.000Z'),
  ('amr_demo_munequitas_luna', 'prf_demo_munequitas', 'prf_demo_luna', 'usr_demo_munequitas', 'accepted', 'Invitación de demostración aceptada por la escort.', '2026-07-30T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO `agency_members` (`id`, `agency_profile_id`, `member_profile_id`) VALUES
  ('agm_demo_munequitas_paola', 'prf_demo_munequitas', 'prf_demo_paola'),
  ('agm_demo_munequitas_luna', 'prf_demo_munequitas', 'prf_demo_luna');
