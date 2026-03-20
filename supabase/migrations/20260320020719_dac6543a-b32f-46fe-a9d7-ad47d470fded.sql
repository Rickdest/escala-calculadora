
-- Fix 2: RLS WRITE policies with has_active_subscription()

-- PRODUCTS INSERT (already has subscription check per schema, but re-ensure with store_id validation)
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
CREATE POLICY "Users can insert own products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND store_id IN (SELECT id FROM stores WHERE stores.user_id = auth.uid())
  AND has_active_subscription()
);

-- PRODUCTS UPDATE
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products"
ON public.products FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND store_id IN (SELECT id FROM stores WHERE stores.user_id = auth.uid())
  AND has_active_subscription()
);

-- PRODUCTS DELETE
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products"
ON public.products FOR DELETE TO authenticated
USING (auth.uid() = user_id AND has_active_subscription());

-- STORES INSERT
DROP POLICY IF EXISTS "Users can insert own stores" ON public.stores;
CREATE POLICY "Users can insert own stores"
ON public.stores FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND has_active_subscription());

-- STORES UPDATE
DROP POLICY IF EXISTS "Users can update own stores" ON public.stores;
CREATE POLICY "Users can update own stores"
ON public.stores FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND has_active_subscription());

-- STORES DELETE
DROP POLICY IF EXISTS "Users can delete own stores" ON public.stores;
CREATE POLICY "Users can delete own stores"
ON public.stores FOR DELETE TO authenticated
USING (auth.uid() = user_id AND has_active_subscription());

-- ADS_REPORTS INSERT
DROP POLICY IF EXISTS "Users can insert own ads reports" ON public.ads_reports;
CREATE POLICY "Users can insert own ads reports"
ON public.ads_reports FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND store_id IN (SELECT id FROM stores WHERE stores.user_id = auth.uid())
  AND has_active_subscription()
);

-- ADS_REPORTS DELETE
DROP POLICY IF EXISTS "Users can delete own ads reports" ON public.ads_reports;
CREATE POLICY "Users can delete own ads reports"
ON public.ads_reports FOR DELETE TO authenticated
USING (auth.uid() = user_id AND has_active_subscription());

-- PRICE_HISTORY INSERT
DROP POLICY IF EXISTS "Users can insert own price history" ON public.price_history;
CREATE POLICY "Users can insert own price history"
ON public.price_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND has_active_subscription());
