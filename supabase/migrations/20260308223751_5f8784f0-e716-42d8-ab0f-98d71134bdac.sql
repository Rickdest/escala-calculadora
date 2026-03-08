
-- Fix: products INSERT must validate store ownership
DROP POLICY "Users can insert own products" ON public.products;
CREATE POLICY "Users can insert own products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

-- Fix: ads_reports INSERT must validate store ownership
DROP POLICY "Users can insert own ads reports" ON public.ads_reports;
CREATE POLICY "Users can insert own ads reports"
  ON public.ads_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
