
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_cpf_seller boolean DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS has_over_450_orders boolean DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS enable_affiliate_commission boolean DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS enable_shopee_campaigns boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shopee_acelera text DEFAULT 'none';
