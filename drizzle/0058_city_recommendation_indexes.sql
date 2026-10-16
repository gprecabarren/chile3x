-- Restrict candidates by city before examining their last 24 hours of views.
CREATE INDEX profiles_city_public_candidates_idx ON profiles(city,status,is_demo);
-- Resolve only one approved public cover, without sorting the full gallery.
CREATE INDEX profile_media_public_cover_idx ON profile_media(profile_id,is_profile_photo DESC,sort_order,id)
 WHERE visibility='public' AND moderation_status='approved' AND media_type='image';
