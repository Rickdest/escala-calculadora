
ALTER TABLE public.shopee_ads_by_product ADD COLUMN IF NOT EXISTS campaign_id bigint;

ALTER TABLE public.shopee_ads_by_product DROP CONSTRAINT IF EXISTS shopee_ads_by_product_user_id_item_id_period_start_key;

CREATE UNIQUE INDEX IF NOT EXISTS shopee_ads_by_product_user_campaign_period 
ON public.shopee_ads_by_product (user_id, campaign_id, period_start) 
WHERE campaign_id IS NOT NULL;
