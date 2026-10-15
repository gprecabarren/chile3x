CREATE INDEX admin_notifications_profile_created_idx ON admin_notifications(profile_id,read_at,created_at);
CREATE INDEX profile_media_pending_review_idx ON profile_media(profile_id) WHERE moderation_status='pending';
CREATE INDEX exclusive_content_pending_review_idx ON exclusive_content_media(collection_id) WHERE moderation_status='pending';
