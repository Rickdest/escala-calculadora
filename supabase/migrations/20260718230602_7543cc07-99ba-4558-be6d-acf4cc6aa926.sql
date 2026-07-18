
-- Fix 1: estoque_movimentacoes - ensure variacao_id belongs to user's variation
DROP POLICY IF EXISTS "Users can insert own estoque_movimentacoes" ON public.estoque_movimentacoes;
CREATE POLICY "Users can insert own estoque_movimentacoes"
ON public.estoque_movimentacoes FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND has_active_subscription()
  AND EXISTS (
    SELECT 1 FROM public.estoque_variacoes v
    WHERE v.id = variacao_id AND v.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own estoque_movimentacoes" ON public.estoque_movimentacoes;
CREATE POLICY "Users can update own estoque_movimentacoes"
ON public.estoque_movimentacoes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.estoque_variacoes v
    WHERE v.id = variacao_id AND v.user_id = auth.uid()
  )
);

-- Fix 2: profiles - prevent email change on update
DROP POLICY IF EXISTS "Users can update own profile safe" ON public.profiles;
CREATE POLICY "Users can update own profile safe"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND NOT (status IS DISTINCT FROM (SELECT p.status FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (trial_inicio IS DISTINCT FROM (SELECT p.trial_inicio FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (trial_fim IS DISTINCT FROM (SELECT p.trial_fim FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (payment_status IS DISTINCT FROM (SELECT p.payment_status FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (payment_email IS DISTINCT FROM (SELECT p.payment_email FROM public.profiles p WHERE p.user_id = auth.uid()))
  AND NOT (email IS DISTINCT FROM (SELECT p.email FROM public.profiles p WHERE p.user_id = auth.uid()))
);
