-- Reopen only samples moved automatically. Keep the original links and media.
INSERT INTO admin_audit_logs(id, actor_email, actor_name, category, action, outcome, entity_type, entity_id, entity_label, summary)
SELECT 'audit_' || lower(hex(randomblob(16))), 'sistema@chile3x.cl', 'Sistema', 'profiles', 'sample.restore', 'success', 'sample', id, display_name, 'Restauró una muestra que había pasado automáticamente a la papelera.'
FROM private_profile_samples
WHERE trash_reason = 'expired' AND trashed_at IS NOT NULL AND migrated_at IS NULL;

UPDATE private_profile_samples
SET trashed_at = NULL, trashed_by = NULL, trash_reason = NULL, updated_at = CURRENT_TIMESTAMP
WHERE trash_reason = 'expired' AND trashed_at IS NOT NULL AND migrated_at IS NULL;

-- Compatibility with the required column used by older Worker versions.
UPDATE private_profile_samples SET expires_at = 253402300799000 WHERE expires_at <> 253402300799000;
