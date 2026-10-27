-- Owner explicitly requested complete removal of these eight former snapshots
-- on 2026-10-27. Preserve current publications, drafts and acceptance records.
DELETE FROM legal_document_versions
WHERE document_id = 'terms'
  AND version IN ('2026.10.27.2', '2026.10.27.1', '2026.10.26.1', '2026.10.14.3')
  AND version <> (SELECT version FROM legal_documents WHERE id = 'terms');

DELETE FROM legal_document_versions
WHERE document_id = 'privacy'
  AND version IN ('2026.10.27.1', '2026.10.26.1', '2026.10.17.1', '2026.10.14.3')
  AND version <> (SELECT version FROM legal_documents WHERE id = 'privacy');
