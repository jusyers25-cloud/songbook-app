-- supabase/fix_null_ids.sql
-- SAFE REPAIR OF NULL UUIDs IN songs, saved_songs, learning_songs
-- IMPORTANT: Run the SELECT checks first and review results. Make a backup before destructive changes.

-- 0) Inspect null counts
SELECT 'songs_null_ids' AS check, COUNT(*) AS cnt FROM public.songs WHERE id IS NULL;
SELECT 'saved_songs_null_song_id' AS check, COUNT(*) AS cnt FROM public.saved_songs WHERE song_id IS NULL;
SELECT 'saved_songs_null_user_id' AS check, COUNT(*) AS cnt FROM public.saved_songs WHERE user_id IS NULL;
SELECT 'learning_songs_null_song_id' AS check, COUNT(*) AS cnt FROM public.learning_songs WHERE song_id IS NULL;
SELECT 'learning_songs_null_user_id' AS check, COUNT(*) AS cnt FROM public.learning_songs WHERE user_id IS NULL;

-- 1) Backup problematic rows (do NOT skip)
CREATE TABLE IF NOT EXISTS public.backup_saved_songs AS
  SELECT * FROM public.saved_songs WHERE song_id IS NULL OR user_id IS NULL;

CREATE TABLE IF NOT EXISTS public.backup_learning_songs AS
  SELECT * FROM public.learning_songs WHERE song_id IS NULL OR user_id IS NULL;

CREATE TABLE IF NOT EXISTS public.backup_songs_null_id AS
  SELECT * FROM public.songs WHERE id IS NULL;

-- 2) Ensure pgcrypto (or uuid-ossp) is available to generate UUIDs
-- Try pgcrypto first (gen_random_uuid()). If that fails, enable uuid-ossp and use uuid_generate_v4().
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- uncomment if you prefer/use uuid_generate_v4()

-- 3) Assign new UUIDs to songs.id where NULL
-- Use gen_random_uuid() (pgcrypto). If you have uuid-ossp only, replace gen_random_uuid() with uuid_generate_v4().
UPDATE public.songs
SET id = gen_random_uuid()
WHERE id IS NULL;

-- 4) OPTIONAL: If saved_songs/learning_songs contain a textual song title column you can try to match and set song_id.
-- Example: if saved_songs has column `song_title` (adjust column name if different)
-- UPDATE public.saved_songs ss
-- SET song_id = s.id
-- FROM public.songs s
-- WHERE ss.song_id IS NULL AND ss.song_title IS NOT NULL AND ss.song_title = s.title;

-- Repeat for learning_songs if you have similar title column:
-- UPDATE public.learning_songs ls
-- SET song_id = s.id
-- FROM public.songs s
-- WHERE ls.song_id IS NULL AND ls.song_title IS NOT NULL AND ls.song_title = s.title;

-- 5) If you cannot infer song_id or user_id for mapping rows, consider removing them after backup.
-- First inspect the backup tables created above. If you decide to remove, run these (DESCTRUCTIVE):
-- DELETE FROM public.saved_songs WHERE song_id IS NULL OR user_id IS NULL;
-- DELETE FROM public.learning_songs WHERE song_id IS NULL OR user_id IS NULL;

-- 6) Set sensible defaults for future inserts (so id is generated automatically)
ALTER TABLE public.songs ALTER COLUMN id SET DEFAULT gen_random_uuid();
-- If mapping tables should default song_id to uuid when inserted by app, do NOT set a default on song_id; the app should provide song_id.

-- 7) After fixing NULL ids, re-run the checks from fix_relationships.sql to create unique index / PK and then the foreign keys.
-- See `supabase/fix_relationships.sql` for those steps.

-- Notes and cautions:
-- - If your songs table previously had duplicates or NULLs, adding a PK/index will fail until those are cleaned.
-- - If mapping rows are missing user_id or song_id and you cannot reconstruct them, the safest course is to keep the backups and delete the orphan rows.
-- - Always run statements one at a time in the Supabase SQL editor and review results.
-- End of file
