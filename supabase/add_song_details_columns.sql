-- Add tuning and notes columns to learning_songs and saved_songs tables

-- Add columns to learning_songs
ALTER TABLE public.learning_songs 
ADD COLUMN IF NOT EXISTS tuning TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add columns to saved_songs
ALTER TABLE public.saved_songs 
ADD COLUMN IF NOT EXISTS tuning TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_learning_songs_user_song ON public.learning_songs(user_id, song_id);
CREATE INDEX IF NOT EXISTS idx_saved_songs_user_song ON public.saved_songs(user_id, song_id);
