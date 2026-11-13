CREATE TABLE private_sample_intakes (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  city TEXT NOT NULL,
  form_json TEXT NOT NULL,
  account_email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  processed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  sample_id TEXT UNIQUE REFERENCES private_profile_samples(id) ON DELETE SET NULL
);

CREATE INDEX private_sample_intakes_created ON private_sample_intakes(created_at, id);
