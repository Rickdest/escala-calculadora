-- 1) Hide OAuth tokens from any client (authenticated/anon).
-- Frontend only needs metadata (store_id, app_type, shop_id); edge functions use service_role
-- which bypasses RLS + column grants.
REVOKE SELECT (access_token, refresh_token) ON public.shopee_tokens FROM authenticated;
REVOKE SELECT (access_token, refresh_token) ON public.shopee_tokens FROM anon;
REVOKE SELECT (access_token, refresh_token) ON public.shopee_tokens FROM PUBLIC;

-- 2) Explicit public SELECT policy on banners bucket (intentional public marketing content).
DROP POLICY IF EXISTS "Public read banners bucket" ON storage.objects;
CREATE POLICY "Public read banners bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'banners');
