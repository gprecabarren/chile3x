-- Explicit owner request, 2026-10-15: Lalita is 23. Preserve all moderation,
-- identity, contact and media data; do not infer ages for other listings.
INSERT INTO admin_audit_logs(id,actor_email,actor_name,category,action,entity_type,entity_id,entity_label,summary,before_data,after_data)
SELECT 'audit_age_'||lower(hex(randomblob(16))), 'chile3x.internal@cuentas.chile3x.invalid', 'Ajuste solicitado por el propietario · Codex', 'profiles', 'profile.update', 'profile', p.id, p.display_name,
 'Completó la edad declarada en 23 a petición explícita del propietario del portal; no cambió la publicación ni la verificación.',
 json_object('age',json_extract(CASE WHEN json_valid(d.metadata) THEN d.metadata ELSE '{}' END,'$.age')),json_object('age','23')
FROM profiles p JOIN profile_details d ON d.profile_id=p.id
WHERE p.id='prf_d795bbb6-e196-4ee7-997d-6b5a02a75673' AND p.handle='lalita' AND p.type='escort'
AND coalesce(json_extract(CASE WHEN json_valid(d.metadata) THEN d.metadata ELSE '{}' END,'$.age'),'')<>'23';

UPDATE profile_details SET metadata=json_set(CASE WHEN json_valid(metadata) THEN metadata ELSE '{}' END,'$.age','23'),updated_at=CURRENT_TIMESTAMP
WHERE profile_id IN (SELECT id FROM profiles WHERE id='prf_d795bbb6-e196-4ee7-997d-6b5a02a75673' AND handle='lalita' AND type='escort')
AND coalesce(json_extract(CASE WHEN json_valid(metadata) THEN metadata ELSE '{}' END,'$.age'),'')<>'23';

UPDATE profiles SET updated_at=CURRENT_TIMESTAMP WHERE id='prf_d795bbb6-e196-4ee7-997d-6b5a02a75673' AND handle='lalita' AND type='escort';
