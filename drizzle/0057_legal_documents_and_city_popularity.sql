CREATE TABLE legal_documents (
 id TEXT PRIMARY KEY CHECK(id IN ('terms','privacy')),
 published_json TEXT, draft_json TEXT,
 version TEXT NOT NULL DEFAULT '2026.10.14.3',
 published_at TEXT NOT NULL DEFAULT '2026-10-14',
 updated_by TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 revision INTEGER NOT NULL DEFAULT 0
);
INSERT INTO legal_documents(id) VALUES('terms'),('privacy');
CREATE TRIGGER legal_documents_revision AFTER UPDATE ON legal_documents WHEN NEW.revision=OLD.revision BEGIN
 UPDATE legal_documents SET revision=OLD.revision+1 WHERE id=NEW.id;
END;
CREATE TABLE legal_document_versions (
 id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES legal_documents(id),
 version TEXT NOT NULL, document_json TEXT NOT NULL, published_at TEXT NOT NULL,
 published_by TEXT
);
CREATE UNIQUE INDEX legal_document_version_unique ON legal_document_versions(document_id,version);
CREATE TABLE account_legal_acceptances (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 terms_version TEXT NOT NULL, privacy_version TEXT NOT NULL,
 accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX account_legal_acceptances_user_idx ON account_legal_acceptances(user_id);
CREATE INDEX profile_views_profile_timestamp_idx ON profile_views(profile_id,viewed_at);
