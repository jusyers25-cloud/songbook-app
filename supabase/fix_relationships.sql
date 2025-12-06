-- supabase/fix_relationships.sql
-- Run these statements in the Supabase SQL editor one-by-one (do not run the entire file inside a transaction in some editors).
-- 1) Inspect songs table for nulls/duplicate ids
SELECT id, COUNT(*) AS cnt
FROM public.songs
GROUP BY id
HAVING COUNT(*) > 1;

SELECT COUNT(*) AS null_id_count
FROM public.songs
WHERE id IS NULL;

-- If the two queries above return no rows / zero, it's safe to add a unique index or primary key on songs.id.
-- 2) Create a unique index on songs.id (concurrent to avoid long locks). If your editor doesn't allow CONCURRENTLY, run without it.
-- IMPORTANT: CONCURRENTLY cannot run inside a transaction; run this single statement on its own.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_id_unique ON public.songs (id);

-- 3) (Optional) Make that index the primary key. This will fail if duplicates/nulls exist.
-- You can skip this if you prefer the unique index alone.
ALTER TABLE public.songs
  ADD CONSTRAINT songs_pkey PRIMARY KEY USING INDEX idx_songs_id_unique;

-- 4) Convert mapping table song_id column to uuid if needed (only if types differ).
-- Example (ONLY run if songs.id is uuid and saved_songs.song_id is text):
-- ALTER TABLE public.saved_songs ALTER COLUMN song_id TYPE uuid USING song_id::uuid;
-- ALTER TABLE public.learning_songs ALTER COLUMN song_id TYPE uuid USING song_id::uuid;

-- 5) Add foreign-key constraints linking mapping tables to songs(id)
ALTER TABLE public.saved_songs
  ADD CONSTRAINT fk_saved_songs_song
  FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;

ALTER TABLE public.learning_songs
  ADD CONSTRAINT fk_learning_songs_song
  FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;

-- 6) Add unique indexes on (user_id, song_id) to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_user_song ON public.saved_songs (user_id, song_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_user_song ON public.learning_songs (user_id, song_id);

-- 7) (Optional) RLS example policies - adapt to your security model
-- If Row-Level Security is enabled, create policies that let users select/insert their own mapping rows:
-- CREATE POLICY "select_owned_saved_songs" ON public.saved_songs
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "insert_owned_saved_songs" ON public.saved_songs
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "select_owned_learning_songs" ON public.learning_songs
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "insert_owned_learning_songs" ON public.learning_songs
--   FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notes:
-- - Run the SELECT checks first; if duplicates or NULL ids exist, fix those rows before creating unique constraints.
-- - If your table/column names differ (capitalization or schema), adjust the statements accordingly.
-- - If you can't run CONCURRENTLY in your environment, remove the CONCURRENTLY keyword for the unique index, but be aware it locks the table briefly.
-- End of file
