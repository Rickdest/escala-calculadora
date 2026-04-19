-- Drop ANY existing SELECT policies on storage.objects targeting these buckets
-- (including ones for the public/anon role) and replace with strict ones.

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (
        qual ILIKE '%product-images%'
        OR qual ILIKE '%banners%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- product-images: only owners can list their own folder
CREATE POLICY "Users can list own product images v2"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- banners: only admins can list
CREATE POLICY "Admins can list banners v2"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'banners'
  AND public.has_role('admin'::public.app_role)
);
