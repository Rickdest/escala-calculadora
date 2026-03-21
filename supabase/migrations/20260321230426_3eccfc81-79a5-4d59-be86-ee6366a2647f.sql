-- Fix: subscription check só em INSERT (criação), não em UPDATE/DELETE

-- PRODUCTS
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products" ON public.products
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products" ON public.products
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- STORES
DROP POLICY IF EXISTS "Users can update own stores" ON public.stores;
CREATE POLICY "Users can update own stores" ON public.stores
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stores" ON public.stores;
CREATE POLICY "Users can delete own stores" ON public.stores
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ESTOQUE_PRODUTOS
DROP POLICY IF EXISTS "Users can update own estoque_produtos" ON public.estoque_produtos;
CREATE POLICY "Users can update own estoque_produtos" ON public.estoque_produtos
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own estoque_produtos" ON public.estoque_produtos;
CREATE POLICY "Users can delete own estoque_produtos" ON public.estoque_produtos
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ESTOQUE_VARIACOES
DROP POLICY IF EXISTS "Users can update own estoque_variacoes" ON public.estoque_variacoes;
CREATE POLICY "Users can update own estoque_variacoes" ON public.estoque_variacoes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own estoque_variacoes" ON public.estoque_variacoes;
CREATE POLICY "Users can delete own estoque_variacoes" ON public.estoque_variacoes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ESTOQUE_MOVIMENTACOES
DROP POLICY IF EXISTS "Users can delete own estoque_movimentacoes" ON public.estoque_movimentacoes;
CREATE POLICY "Users can delete own estoque_movimentacoes" ON public.estoque_movimentacoes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);