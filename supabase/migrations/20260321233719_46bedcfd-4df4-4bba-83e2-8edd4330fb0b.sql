-- Remove has_active_subscription() from SELECT policies on stores, products, estoque tables
-- This prevents data from being invisible when subscription expires (UI already blocks via TrialExpiredBlock)

-- STORES SELECT
DROP POLICY IF EXISTS "Users can view own stores" ON public.stores;
CREATE POLICY "Users can view own stores" ON public.stores
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- PRODUCTS SELECT
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
CREATE POLICY "Users can view own products" ON public.products
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ESTOQUE_PRODUTOS SELECT
DROP POLICY IF EXISTS "Users can view own estoque_produtos" ON public.estoque_produtos;
CREATE POLICY "Users can view own estoque_produtos" ON public.estoque_produtos
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ESTOQUE_VARIACOES SELECT
DROP POLICY IF EXISTS "Users can view own estoque_variacoes" ON public.estoque_variacoes;
CREATE POLICY "Users can view own estoque_variacoes" ON public.estoque_variacoes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ESTOQUE_MOVIMENTACOES SELECT
DROP POLICY IF EXISTS "Users can view own estoque_movimentacoes" ON public.estoque_movimentacoes;
CREATE POLICY "Users can view own estoque_movimentacoes" ON public.estoque_movimentacoes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- PRICE_HISTORY SELECT
DROP POLICY IF EXISTS "Users can view own price history" ON public.price_history;
CREATE POLICY "Users can view own price history" ON public.price_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ADS_REPORTS SELECT
DROP POLICY IF EXISTS "Users can view own ads reports" ON public.ads_reports;
CREATE POLICY "Users can view own ads reports" ON public.ads_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);