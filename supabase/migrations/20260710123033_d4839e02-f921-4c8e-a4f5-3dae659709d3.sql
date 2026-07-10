
-- Trigger util (already exists as public.update_updated_at_column)

-- ml_products
CREATE TABLE public.ml_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  ad_id text,
  sku text,
  name text,
  variation text,
  status text,
  ad_type text CHECK (ad_type IN ('classico','premium')),
  sale_price numeric,
  cost_price numeric,
  packaging_cost numeric DEFAULT 0,
  additional_cost numeric DEFAULT 0,
  freight_cost numeric DEFAULT 0,
  freight_mode text NOT NULL DEFAULT 'none' CHECK (freight_mode IN ('per_unit','per_sale','total_manual','none')),
  tax_value numeric DEFAULT 0,
  tax_mode text NOT NULL DEFAULT 'default' CHECK (tax_mode IN ('percent','fixed','default')),
  notes text,
  linked_manually boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ml_products_user_store_key
  ON public.ml_products (user_id, store_id, COALESCE(sku,''), COALESCE(ad_id,''));
CREATE INDEX ml_products_store_idx ON public.ml_products(store_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ml_products TO authenticated;
GRANT ALL ON public.ml_products TO service_role;
ALTER TABLE public.ml_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ml_products" ON public.ml_products
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ml_products_updated_at
  BEFORE UPDATE ON public.ml_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ml_fee_config
CREATE TABLE public.ml_fee_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  classic_pct numeric NOT NULL DEFAULT 14,
  premium_pct numeric NOT NULL DEFAULT 19,
  fixed_fee_min_price numeric NOT NULL DEFAULT 79,
  fixed_fee_tiers jsonb NOT NULL DEFAULT '[
    {"min":0,"max":12.5,"fee":0,"percent":50},
    {"min":12.5,"max":29,"fee":6.25},
    {"min":29,"max":50,"fee":6.50},
    {"min":50,"max":79,"fee":6.75}
  ]'::jsonb,
  other_fees jsonb NOT NULL DEFAULT '[]'::jsonb,
  effective_date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, store_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ml_fee_config TO authenticated;
GRANT ALL ON public.ml_fee_config TO service_role;
ALTER TABLE public.ml_fee_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ml_fee_config" ON public.ml_fee_config
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ml_fee_config_updated_at
  BEFORE UPDATE ON public.ml_fee_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ml_import_history
CREATE TABLE public.ml_import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  file_name text,
  file_hash text,
  period_start date,
  period_end date,
  ads_count integer NOT NULL DEFAULT 0,
  linked_count integer NOT NULL DEFAULT 0,
  unlinked_count integer NOT NULL DEFAULT 0,
  gross_sales_total numeric NOT NULL DEFAULT 0,
  raw_rows jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ml_import_history_store_idx ON public.ml_import_history(store_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ml_import_history TO authenticated;
GRANT ALL ON public.ml_import_history TO service_role;
ALTER TABLE public.ml_import_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ml_import_history" ON public.ml_import_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
