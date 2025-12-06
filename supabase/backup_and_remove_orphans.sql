-- supabase/backup_and_remove_orphans.sql
-- SAFE BACKUP AND OPTIONAL REMOVAL OF ORPHAN MAPPING ROWS
-- Run the SELECTs and backup statements first and inspect the backup tables before running the destructive DELETEs.

-- 1) Preview orphan mapping rows (rows that reference a non-existing songs.id)
SELECT ss.*
FROM public.saved_songs ss
LEFT JOIN public.songs s ON ss.song_id = s.id
WHERE ss.song_id IS NOT NULL AND s.id IS NULL
LIMIT 200;

SELECT ls.*
FROM public.learning_songs ls
LEFT JOIN public.songs s ON ls.song_id = s.id
WHERE ls.song_id IS NOT NULL AND s.id IS NULL
LIMIT 200;

-- 2) Create backup tables for safety (non-destructive)
CREATE TABLE IF NOT EXISTS public.backup_orphan_saved_songs AS
  SELECT NOW() AS backed_up_at, * FROM public.saved_songs WHERE song_id IS NOT NULL AND song_id NOT IN (SELECT id FROM public.songs);

CREATE TABLE IF NOT EXISTS public.backup_orphan_learning_songs AS
  SELECT NOW() AS backed_up_at, * FROM public.learning_songs WHERE song_id IS NOT NULL AND song_id NOT IN (SELECT id FROM public.songs);

-- 3) Inspect backups
SELECT * FROM public.backup_orphan_saved_songs LIMIT 50;
SELECT * FROM public.backup_orphan_learning_songs LIMIT 50;

-- 4) OPTIONAL DELETION (DESTRUCTIVE) - only run after you have confirmed backups above
-- Uncomment the DELETEs when you are ready to remove orphan rows from mapping tables.

-- DELETE FROM public.saved_songs WHERE song_id IS NOT NULL AND song_id NOT IN (SELECT id FROM public.songs);
-- DELETE FROM public.learning_songs WHERE song_id IS NOT NULL AND song_id NOT IN (SELECT id FROM public.songs);

-- 5) After deletion, re-run the FK/index SQL in `apply_fks_and_indexes.sql` to add constraints.

-- End of file
