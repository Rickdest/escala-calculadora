
CREATE TABLE public.shopee_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id text NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  product_sales jsonb NOT NULL DEFAULT '{}'::jsonb,
  period_days integer NOT NULL DEFAULT 90,
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

ALTER TABLE public.shopee_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own performance"
  ON public.shopee_performance FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Deny client inserts on performance"
  ON public.shopee_performance FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Deny client updates on performance"
  ON public.shopee_performance FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny client deletes on performance"
  ON public.shopee_performance FOR DELETE
  TO authenticated
  USING (false);
