
-- Fix stores UPDATE policy: add WITH CHECK to prevent ownership transfer
DROP POLICY IF EXISTS "Users can update own stores" ON public.stores;
CREATE POLICY "Users can update own stores" ON public.stores
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix products UPDATE policy: add WITH CHECK to prevent ownership/store transfer
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products" ON public.products
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND store_id IN (SELECT id FROM stores WHERE stores.user_id = auth.uid()));
