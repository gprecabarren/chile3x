-- Telegram Communities groups the public and Members spaces under one
-- community. Older installations may have assigned an unnecessary third
-- administrative alerts chat; retire that assignment without deleting data.
UPDATE `telegram_chats`
SET
	`role` = 'unassigned',
	`updates_thread_id` = NULL,
	`is_active` = false,
	`updated_at` = CURRENT_TIMESTAMP
WHERE `role` = 'alerts';
