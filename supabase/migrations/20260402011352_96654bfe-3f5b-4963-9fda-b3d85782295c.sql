
CREATE TABLE public.shopee_ads_by_product (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id bigint NOT NULL,
  item_id bigint NOT NULL,
  item_name text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  expense numeric DEFAULT 0,
  gmv numeric DEFAULT 0,
  direct_gmv numeric DEFAULT 0,
  orders integer DEFAULT 0,
  direct_orders integer DEFAULT 0,
  avg_position numeric,
  roas numeric DEFAULT 0,
  direct_roas numeric DEFAULT 0,
  acos numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cost_per_order numeric DEFAULT 0,
  days_active integer DEFAULT 0,
  daily_data jsonb DEFAULT '[]',
  campaign_ids jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, item_id, period_start)
);

ALTER TABLE public.shopee_ads_by_product ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shopee_ads_by_product" ON public.shopee_ads_by_product
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shopee_ads_by_product" ON public.shopee_ads_by_product
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND has_active_subscription());
CREATE POLICY "Users can update own shopee_ads_by_product" ON public.shopee_ads_by_product
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own shopee_ads_by_product" ON public.shopee_ads_by_product
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
