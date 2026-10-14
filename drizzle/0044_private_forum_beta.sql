-- Additive only: no announcement, account, media, or moderation state changes.
CREATE TABLE forum_sections (
  id TEXT PRIMARY KEY NOT NULL, group_name TEXT NOT NULL, title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', rules TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX forum_sections_order_idx ON forum_sections(is_archived,group_name,sort_order);
CREATE TABLE forum_topics (
  id TEXT PRIMARY KEY NOT NULL, section_id TEXT NOT NULL REFERENCES forum_sections(id), title TEXT NOT NULL,
  author_id TEXT, author_name TEXT NOT NULL, is_pinned INTEGER NOT NULL DEFAULT 0, is_locked INTEGER NOT NULL DEFAULT 0,
  trashed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX forum_topics_section_idx ON forum_topics(section_id,trashed_at,is_pinned,updated_at);
CREATE INDEX forum_topics_activity_idx ON forum_topics(trashed_at,updated_at);
CREATE TABLE forum_posts (
  id TEXT PRIMARY KEY NOT NULL, topic_id TEXT NOT NULL REFERENCES forum_topics(id), author_id TEXT, author_name TEXT NOT NULL,
  body TEXT NOT NULL, trashed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX forum_posts_topic_idx ON forum_posts(topic_id,created_at,id);

-- Original Chile3X labels adapted from a researched directory/forum taxonomy.
-- No external posts, accounts, photographs or contact data are imported.
INSERT INTO forum_sections (id,group_name,title,description,sort_order) VALUES
('foro_normas','Comunidad Chile3X','Normas y anuncios del equipo','Acuerdos de convivencia, novedades del foro y avisos oficiales.',0),
('foro_presentaciones','Comunidad Chile3X','Presentaciones','Un espacio para presentarse sin divulgar información privada.',10),
('foro_ayuda','Comunidad Chile3X','Consultas, sugerencias y soporte','Consultas sobre el portal y mejoras de la comunidad.',20),
('foro_seguridad','Comunidad Chile3X','Seguridad y prevención de fraudes','Orientaciones preventivas. Las denuncias con datos personales se envían por canales privados.',30),
('foro_anuncios_stgo','Anuncios y publicaciones','Escorts en Santiago','Publicaciones y consultas relacionadas con el directorio de Santiago.',10),
('foro_anuncios_providencia','Anuncios y publicaciones','Escorts en Providencia','Publicaciones por comuna y conversaciones sobre el directorio.',20),
('foro_anuncios_regiones','Anuncios y publicaciones','Escorts en regiones','Publicaciones y consultas fuera de la Región Metropolitana.',30),
('foro_anuncios_masajes','Anuncios y publicaciones','Masajes y centros','Publicaciones sobre masajes y centros de atención.',40),
('foro_anuncios_agencias','Anuncios y publicaciones','Agencias','Información institucional y relaciones autorizadas entre agencias y perfiles.',50),
('foro_anuncios_arriendos','Anuncios y publicaciones','Arriendos y espacios','Espacios ofrecidos, disponibilidad y consultas de arriendo.',60),
('foro_stgo_escorts','Santiago y alrededores','Escorts: consultas y experiencias','Conversaciones respetuosas sobre anuncios; sin información privada ni acusaciones sin fundamento.',10),
('foro_stgo_masajes','Santiago y alrededores','Masajes: consultas y experiencias','Información y conversaciones sobre masajes.',20),
('foro_stgo_cafes','Santiago y alrededores','Cafés y locales','Conversaciones sobre cafés y locales para adultos.',30),
('foro_stgo_clubs','Santiago y alrededores','Clubs y vida nocturna','Locales, actividades y vida nocturna.',40),
('foro_stgo_trans','Santiago y alrededores','Comunidad trans y diversidad','Un espacio inclusivo para consultas y conversaciones respetuosas.',50),
('foro_stgo_independientes','Santiago y alrededores','Anunciantes independientes','Consultas generales sobre publicaciones independientes.',60),
('foro_stgo_espacios','Santiago y alrededores','Moteles, departamentos y arriendos','Información de espacios y consultas de alojamiento.',70),
('foro_stgo_eventos','Santiago y alrededores','Eventos y espectáculos','Información de eventos y espectáculos para adultos.',80),
('foro_stgo_tiendas','Santiago y alrededores','Tiendas y productos','Productos, comercios y recomendaciones responsables.',90),
('foro_stgo_social','Santiago y alrededores','Citas y relaciones','Conversaciones entre adultos; prohibida la explotación, coacción o difusión de datos privados.',100),
('foro_region_xv','Regiones de Chile','Arica y Parinacota, XV región','Arica y localidades de la región: anuncios, masajes, locales y espacios.',10),
('foro_region_i','Regiones de Chile','Tarapacá, I región','Iquique y localidades de la región.',20),
('foro_region_ii','Regiones de Chile','Antofagasta, II región','Antofagasta, Calama y localidades de la región.',30),
('foro_region_iii','Regiones de Chile','Atacama, III región','Copiapó, Vallenar y localidades de la región.',40),
('foro_region_iv','Regiones de Chile','Coquimbo, IV región','La Serena, Coquimbo y localidades de la región.',50),
('foro_region_v','Regiones de Chile','Valparaíso, V región','Valparaíso, Viña del Mar y localidades de la región.',60),
('foro_region_rm','Regiones de Chile','Región Metropolitana','Santiago y comunas de la Región Metropolitana.',70),
('foro_region_vi','Regiones de Chile','O’Higgins, VI región','Rancagua y localidades de la región.',80),
('foro_region_vii','Regiones de Chile','Maule, VII región','Talca, Curicó, Linares y localidades de la región.',90),
('foro_region_xvi','Regiones de Chile','Ñuble, XVI región','Chillán y localidades de la región.',100),
('foro_region_viii','Regiones de Chile','Biobío, VIII región','Concepción, Talcahuano, Los Ángeles y localidades de la región.',110),
('foro_region_ix','Regiones de Chile','La Araucanía, IX región','Temuco, Villarrica, Pucón y localidades de la región.',120),
('foro_region_xiv','Regiones de Chile','Los Ríos, XIV región','Valdivia y localidades de la región.',130),
('foro_region_x','Regiones de Chile','Los Lagos, X región','Puerto Montt, Osorno, Chiloé y localidades de la región.',140),
('foro_region_xi','Regiones de Chile','Aysén, XI región','Coyhaique y localidades de la región.',150),
('foro_region_xii','Regiones de Chile','Magallanes, XII región','Punta Arenas y localidades de la región.',160),
('foro_region_otras','Regiones de Chile','Otras ciudades y consultas nacionales','Consultas sobre ciudades y desplazamientos informativos.',170),
('foro_general','Conversación y cultura','Actualidad y conversación general','Conversaciones que respeten las normas del foro.',10),
('foro_cultura','Conversación y cultura','Música, cine y series','Recomendaciones culturales sin distribución de material sin autorización.',20),
('foro_humor','Conversación y cultura','Humor','Humor respetuoso, sin acoso ni información privada.',30),
('foro_clasificados','Conversación y cultura','Clasificados y colaboración','Consultas e intercambio de información lícita entre adultos.',40),
('foro_fotos','Contenido y creadores','Fotografía y galerías','Conversaciones sobre contenido propio y autorizado. Archivos adjuntos aún no habilitados.',10),
('foro_videos','Contenido y creadores','Videos','Conversaciones sobre videos y su publicación. Archivos adjuntos aún no habilitados.',20),
('foro_creadores','Contenido y creadores','Creadores y contenido exclusivo','Consultas sobre contenido autorizado; no se permite difundir material íntimo sin consentimiento.',30);
