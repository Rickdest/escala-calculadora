-- Harden RLS: require active subscription for SELECT on all user-data tables

DROP POLICY IF EXISTS "Users can view own products" ON public.products;
CREATE POLICY "Users can view own products"
ON public.products FOR SELECT TO authenticated
USING (auth.uid() = user_id AND has_active_subscription());

DROP POLICY IF EXISTS "Users can view own stores" ON public.stores;
CREATE POLICY "Users can view own stores"
ON public.stores FOR SELECT TO authenticated
USING (auth.uid() = user_id AND has_active_subscription());

DROP POLICY IF EXISTS "Users can view own ads reports" ON public.ads_reports;
CREATE POLICY "Users can view own ads reports"
ON public.ads_reports FOR SELECT TO authenticated
USING (auth.uid() = user_id AND has_active_subscription());

DROP POLICY IF EXISTS "Users can view own estoque_produtos" ON public.estoque_produtos;
CREATE POLICY "Users can view own estoque_produtos"
ON public.estoque_produtos FOR SELECT TO authenticated
USING (auth.uid() = user_id AND has_active_subscription());

DROP POLICY IF EXISTS "Users can view own estoque_variacoes" ON public.estoque_variacoes;
CREATE POLICY "Users can view own estoque_variacoes"
ON public.estoque_variacoes FOR SELECT TO authenticated
USING (auth.uid() = user_id AND has_active_subscription());

DROP POLICY IF EXISTS "Users can view own estoque_movimentacoes" ON public.estoque_movimentacoes;
CREATE POLICY "Users can view own estoque_movimentacoes"
ON public.estoque_movimentacoes FOR SELECT TO authenticated
USING (auth.uid() = user_id AND has_active_subscription());

DROP POLICY IF EXISTS "Users can view own price history" ON public.price_history;
CREATE POLICY "Users can view own price history"
ON public.price_history FOR SELECT TO authenticated
USING (auth.uid() = user_id AND has_active_subscription());