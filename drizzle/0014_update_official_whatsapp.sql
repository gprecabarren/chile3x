INSERT INTO `site_settings` (`key`, `value`, `updated_by`, `updated_at`)
VALUES ('contact_whatsapp', '56933365005', NULL, CURRENT_TIMESTAMP)
ON CONFLICT (`key`) DO UPDATE SET
  `value` = excluded.`value`,
  `updated_by` = NULL,
  `updated_at` = CURRENT_TIMESTAMP;
