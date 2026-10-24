-- Do not rewrite existing listings silently. Their form explains the conflict
-- and lets the owner/admin correct it. All new writes enforce the same rule.
CREATE TRIGGER profile_tags_compatible_insert BEFORE INSERT ON profile_tags BEGIN
 SELECT RAISE(ABORT,'incompatible_profile_tags') WHERE EXISTS (
  SELECT 1 FROM profile_tags t WHERE t.profile_id=NEW.profile_id AND
   ((NEW.tag='milf' AND t.tag IN ('hombres','trans')) OR (NEW.tag IN ('hombres','trans') AND t.tag='milf'))
 );
END;
CREATE TRIGGER profile_tags_compatible_update BEFORE UPDATE OF tag,profile_id ON profile_tags BEGIN
 SELECT RAISE(ABORT,'incompatible_profile_tags') WHERE EXISTS (
  SELECT 1 FROM profile_tags t WHERE t.profile_id=NEW.profile_id AND t.id<>NEW.id AND
   ((NEW.tag='milf' AND t.tag IN ('hombres','trans')) OR (NEW.tag IN ('hombres','trans') AND t.tag='milf'))
 );
END;
