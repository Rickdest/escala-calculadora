-- 1. Torna a janela de trial exatamente 7 dias (sem margem de boundary)
DROP POLICY IF EXISTS "Users can insert own profile safe" ON profiles;

CREATE POLICY "Users can insert own profile safe"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'trial'
  AND trial_inicio = now()::date::timestamptz
  AND trial_fim = (now()::date::timestamptz + interval '7 days')
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid()
  )
);

-- 2. UPDATE: protege explicitamente todos os campos sensíveis
DROP POLICY IF EXISTS "Users can update own profile safe" ON profiles;

CREATE POLICY "Users can update own profile safe"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status IS NOT DISTINCT FROM (SELECT p.status FROM profiles p WHERE p.user_id = auth.uid())
  AND trial_inicio IS NOT DISTINCT FROM (SELECT p.trial_inicio FROM profiles p WHERE p.user_id = auth.uid())
  AND trial_fim IS NOT DISTINCT FROM (SELECT p.trial_fim FROM profiles p WHERE p.user_id = auth.uid())
  AND hotmart_status IS NOT DISTINCT FROM (SELECT p.hotmart_status FROM profiles p WHERE p.user_id = auth.uid())
  AND hotmart_email IS NOT DISTINCT FROM (SELECT p.hotmart_email FROM profiles p WHERE p.user_id = auth.uid())
);