-- Update the previously published retention clause without overwriting other edits or drafts.
CREATE TABLE _sample_privacy_update (old_json TEXT NOT NULL, new_json TEXT NOT NULL);
INSERT INTO _sample_privacy_update
SELECT d.published_json,
  json_set(d.published_json, '$.sections[' || s.key || '].blocks[' || b.key || '].items[' || i.key || ']',
    '**Muestras privadas y fichas recibidas:** la persona puede enviar sus datos de perfil y un correo opcional para su futura cuenta. Solo administración autorizada consulta la ficha. El enlace de una muestra sigue habilitado hasta su revocación, retiro a papelera o conversión en anuncio. La papelera permite restaurar o eliminar manualmente. Se conservan los datos mientras sean necesarios para la finalidad informada, con derecho a solicitar su retiro o eliminación por el canal de privacidad.')
FROM legal_documents d, json_each(CASE WHEN json_valid(d.published_json) THEN d.published_json END, '$.sections') s,
  json_each(s.value, '$.blocks') b, json_each(b.value, '$.items') i
WHERE d.id = 'privacy' AND d.version < '2026.11.13.1'
  AND i.value LIKE '**Muestras privadas:** vigencia inicial de siete días,%'
LIMIT 1;

INSERT INTO legal_document_versions(id, document_id, version, document_json, published_at, published_by)
SELECT 'sample-privacy-previous-' || d.version, d.id, d.version, u.old_json, d.published_at, d.updated_by
FROM legal_documents d JOIN _sample_privacy_update u ON d.published_json = u.old_json
WHERE d.id = 'privacy'
ON CONFLICT(document_id, version) DO NOTHING;

INSERT INTO legal_document_versions(id, document_id, version, document_json, published_at, published_by)
SELECT 'sample-privacy-20261113', 'privacy', '2026.11.13.1', new_json, '2026-11-13', NULL
FROM _sample_privacy_update;

UPDATE legal_documents
SET published_json = (SELECT new_json FROM _sample_privacy_update),
    version = '2026.11.13.1', published_at = '2026-11-13', updated_at = CURRENT_TIMESTAMP, updated_by = NULL
WHERE id = 'privacy' AND EXISTS (SELECT 1 FROM _sample_privacy_update);

DROP TABLE _sample_privacy_update;
