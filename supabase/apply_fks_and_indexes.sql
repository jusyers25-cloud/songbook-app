-- supabase/apply_fks_and_indexes.sql
-- Apply Foreign Keys and Unique Indexes for mapping tables
-- Run this only after:
--  * `songs.id` is unique/non-null (primary key)
--  * Orphan mapping rows (mapping.song_id referencing no songs.id) have been removed or backed up
-- Use the SQL editor in Supabase and run each statement one at a time. If CONCURRENTLY is not allowed in your editor, run without CONCURRENTLY.

-- 1) Ensure songs.id unique index exists (run on its own if using CONCURRENTLY)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_songs_id_unique ON public.songs (id);

-- 2) Optionally make it primary key (only if no existing PK)
-- ALTER TABLE public.songs
--   ADD CONSTRAINT songs_pkey PRIMARY KEY USING INDEX idx_songs_id_unique;

-- 3) Add foreign keys linking mapping tables to songs.id
ALTER TABLE public.saved_songs
  ADD CONSTRAINT fk_saved_songs_song
  FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;

ALTER TABLE public.learning_songs
  ADD CONSTRAINT fk_learning_songs_song
  FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;

-- 4) Add unique indexes on (user_id, song_id) to prevent duplicate saves
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_user_song ON public.saved_songs (user_id, song_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_user_song ON public.learning_songs (user_id, song_id);

-- 5) (Optional) Example RLS policies (adapt before applying)
-- If Row-Level Security is enabled on mapping tables, add policies that allow users to manage their rows.
-- Uncomment and adapt when ready.

-- CREATE POLICY "select_owned_saved_songs" ON public.saved_songs
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "insert_owned_saved_songs" ON public.saved_songs
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "delete_owned_saved_songs" ON public.saved_songs
--   FOR DELETE USING (auth.uid() = user_id);

-- CREATE POLICY "select_owned_learning_songs" ON public.learning_songs
--   FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "insert_owned_learning_songs" ON public.learning_songs
--   FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "delete_owned_learning_songs" ON public.learning_songs
--   FOR DELETE USING (auth.uid() = user_id);

-- End of file
