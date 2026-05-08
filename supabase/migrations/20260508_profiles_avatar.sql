-- Add avatar_url column to profiles so other users can see profile pictures
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
