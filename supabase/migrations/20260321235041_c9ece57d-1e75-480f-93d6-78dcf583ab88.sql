-- Fix: product_ads_metrics RLS should use authenticated, not public
DROP POLICY IF EXISTS "Users can manage own ads metrics" ON public.product_ads_metrics;

CREATE POLICY "Users can select own ads metrics" ON public.product_ads_metrics
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ads metrics" ON public.product_ads_metrics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND has_active_subscription());

CREATE POLICY "Users can update own ads metrics" ON public.product_ads_metrics
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ads metrics" ON public.product_ads_metrics
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Fix: ads_reports DELETE should not require active subscription
DROP POLICY IF EXISTS "Users can delete own ads reports" ON public.ads_reports;
CREATE POLICY "Users can delete own ads reports" ON public.ads_reports
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);