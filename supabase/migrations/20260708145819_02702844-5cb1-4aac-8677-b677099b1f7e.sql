
CREATE TABLE public.shopee_product_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  shopee_item_id text NOT NULL,
  parent_sku text,
  variation_sku text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  manual_unit_cost numeric,
  link_type text NOT NULL DEFAULT 'product',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, store_id, shopee_item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopee_product_links TO authenticated;
GRANT ALL ON public.shopee_product_links TO service_role;

ALTER TABLE public.shopee_product_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own shopee product links"
  ON public.shopee_product_links FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_shopee_product_links_updated_at
  BEFORE UPDATE ON public.shopee_product_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profit_analyses
  ADD COLUMN IF NOT EXISTS extra_costs jsonb NOT NULL DEFAULT '{}'::jsonb;
