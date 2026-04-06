
-- Add store_id to shopee_tokens
ALTER TABLE public.shopee_tokens ADD COLUMN IF NOT EXISTS store_id uuid;

-- Add store_id to shopee_ads_by_product  
ALTER TABLE public.shopee_ads_by_product ADD COLUMN IF NOT EXISTS store_id uuid;

-- Add store_id to shopee_auth_states
ALTER TABLE public.shopee_auth_states ADD COLUMN IF NOT EXISTS store_id uuid;

-- Drop old unique constraint on shopee_tokens and create new one with store_id
-- First check if old constraint exists by name, drop it, then create new
DO $$
BEGIN
  -- Drop existing unique constraints that might conflict
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shopee_tokens_user_id_shop_id_app_type_key') THEN
    ALTER TABLE public.shopee_tokens DROP CONSTRAINT shopee_tokens_user_id_shop_id_app_type_key;
  END IF;
  
  -- Create new unique constraint including store_id
  ALTER TABLE public.shopee_tokens ADD CONSTRAINT shopee_tokens_user_store_shop_app_unique 
    UNIQUE (user_id, store_id, shop_id, app_type);
END $$;

-- Backfill existing tokens with the user's first store
UPDATE public.shopee_tokens t
SET store_id = (
  SELECT s.id FROM public.stores s WHERE s.user_id = t.user_id ORDER BY s.created_at ASC LIMIT 1
)
WHERE t.store_id IS NULL;

-- Backfill existing shopee_ads_by_product with the user's first store
UPDATE public.shopee_ads_by_product a
SET store_id = (
  SELECT s.id FROM public.stores s WHERE s.user_id = a.user_id ORDER BY s.created_at ASC LIMIT 1
)
WHERE a.store_id IS NULL;
