
CREATE OR REPLACE FUNCTION public.get_shopee_token_metadata(p_app_type text DEFAULT NULL, p_store_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  shop_id bigint,
  app_type text,
  store_id uuid,
  expire_in integer,
  token_created_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.shop_id, t.app_type, t.store_id, t.expire_in, t.token_created_at, t.created_at, t.updated_at
  FROM public.shopee_tokens t
  WHERE t.user_id = auth.uid()
    AND (p_app_type IS NULL OR t.app_type = p_app_type)
    AND (p_store_id IS NULL OR t.store_id = p_store_id)
  ORDER BY t.updated_at DESC
  LIMIT 1
$$;
