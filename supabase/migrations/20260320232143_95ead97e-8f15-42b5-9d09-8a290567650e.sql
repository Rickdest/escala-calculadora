
-- Table for ads metrics per product
CREATE TABLE public.product_ads_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  shopee_product_id TEXT,
  shopee_product_name TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  imported_at TIMESTAMPTZ DEFAULT now(),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  items_sold INTEGER DEFAULT 0,
  gmv DECIMAL(10,2) DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  roas DECIMAL(6,2) DEFAULT 0,
  acos DECIMAL(5,2) DEFAULT 0,
  avg_position SMALLINT,
  ctr DECIMAL(5,2) DEFAULT 0,
  conv_rate DECIMAL(5,2) DEFAULT 0,
  direct_roas DECIMAL(6,2) DEFAULT 0,
  direct_acos DECIMAL(5,2) DEFAULT 0,
  cost_per_conv DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.product_ads_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ads metrics"
  ON public.product_ads_metrics
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_product_ads_metrics_updated_at
  BEFORE UPDATE ON public.product_ads_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add shopee_product_id to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shopee_product_id TEXT;
