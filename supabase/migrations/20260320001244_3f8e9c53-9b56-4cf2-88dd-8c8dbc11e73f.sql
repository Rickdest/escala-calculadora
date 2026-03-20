-- Drop avatar-related storage policies
DROP POLICY IF EXISTS "Users can view own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;

-- Remove avatar_url column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;