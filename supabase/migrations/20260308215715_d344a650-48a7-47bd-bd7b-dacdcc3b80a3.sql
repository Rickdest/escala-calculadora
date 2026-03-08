CREATE TABLE public.ads_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  report_period text,
  shop_name text,
  imported_at timestamp with time zone NOT NULL DEFAULT now(),
  ads_data jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.ads_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ads reports" ON public.ads_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ads reports" ON public.ads_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own ads reports" ON public.ads_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);