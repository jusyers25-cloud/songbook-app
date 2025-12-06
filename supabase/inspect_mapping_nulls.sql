-- supabase/inspect_mapping_nulls.sql
-- Inspect and optionally repair rows in saved_songs and learning_songs where song_id IS NULL.
-- Run these statements in the Supabase SQL editor one-by-one and inspect results before running any UPDATE/DELETE.

-- 0) Show column lists for mapping tables so you can see if a title column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='saved_songs'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='learning_songs'
ORDER BY ordinal_position;

-- 1) Preview rows with NULL song_id (limit for quick review)
SELECT * FROM public.saved_songs WHERE song_id IS NULL LIMIT 200;
SELECT * FROM public.learning_songs WHERE song_id IS NULL LIMIT 200;

-- 2) If your mapping tables contain a textual song title column (e.g. song_title or title), try to match to songs
-- Replace `song_title` below with the actual column name if present.
-- Example exact-title match (case-insensitive):
-- UPDATE public.saved_songs ss
-- SET song_id = s.id
-- FROM public.songs s
-- WHERE ss.song_id IS NULL
--   AND ss.song_title IS NOT NULL
--   AND lower(trim(ss.song_title)) = lower(trim(s.title))
-- RETURNING ss.*;

-- 3) If the mapping row has some other metadata (artist, created_at), you can craft similar joins.

-- 4) If you cannot match mapping rows and you want to remove them after backing up, do this:
-- (a) Create backup (non-destructive)
CREATE TABLE IF NOT EXISTS public.backup_saved_songs_nulls AS
  SELECT * FROM public.saved_songs WHERE song_id IS NULL OR user_id IS NULL;

CREATE TABLE IF NOT EXISTS public.backup_learning_songs_nulls AS
  SELECT * FROM public.learning_songs WHERE song_id IS NULL OR user_id IS NULL;

-- (b) After reviewing backups, optionally delete orphan mapping rows (DESTRUCTIVE):
-- DELETE FROM public.saved_songs WHERE song_id IS NULL OR user_id IS NULL;
-- DELETE FROM public.learning_songs WHERE song_id IS NULL OR user_id IS NULL;

-- 5) After repairing or removing orphan mapping rows, re-run fix_relationships.sql steps to add FKs and indexes.

-- Notes:
-- - Do NOT run the DELETE statements until you confirm the backup content and are comfortable losing those rows.
-- - If you want, paste the results of the SELECTs here and I can suggest the exact matching UPDATE statements.
-- End of file
