
-- Add app_type to shopee_tokens
ALTER TABLE public.shopee_tokens ADD COLUMN IF NOT EXISTS app_type text NOT NULL DEFAULT 'seller';

-- Drop old unique constraint and add new one with app_type
ALTER TABLE public.shopee_tokens DROP CONSTRAINT IF EXISTS shopee_tokens_user_id_shop_id_key;
ALTER TABLE public.shopee_tokens ADD CONSTRAINT shopee_tokens_user_shop_app UNIQUE (user_id, shop_id, app_type);

-- Add app_type to shopee_auth_states
ALTER TABLE public.shopee_auth_states ADD COLUMN IF NOT EXISTS app_type text NOT NULL DEFAULT 'seller';
