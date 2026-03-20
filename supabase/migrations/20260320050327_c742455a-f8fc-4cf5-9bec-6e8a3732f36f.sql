-- 1. Garante que cada user_id só pode ter UM row na tabela profiles
ALTER TABLE profiles
  ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- 2. Recria a policy de INSERT bloqueando re-inserção
DROP POLICY IF EXISTS "Users can insert own profile safe" ON profiles;

CREATE POLICY "Users can insert own profile safe"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'trial'
  AND trial_fim <= (now() + interval '8 days')
  AND trial_fim >= (now() + interval '6 days')
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid()
  )
);

-- 3. Garante que usuário não pode alterar user_id, trial_inicio, nem escalar status via UPDATE
DROP POLICY IF EXISTS "Users can update own profile safe" ON profiles;

CREATE POLICY "Users can update own profile safe"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND NOT (status IS DISTINCT FROM (SELECT gp.status FROM get_own_profile_protected() gp(status, trial_inicio, trial_fim, hotmart_status, hotmart_email)))
  AND NOT (trial_fim IS DISTINCT FROM (SELECT gp.trial_fim FROM get_own_profile_protected() gp(status, trial_inicio, trial_fim, hotmart_status, hotmart_email)))
  AND NOT (trial_inicio IS DISTINCT FROM (SELECT gp.trial_inicio FROM get_own_profile_protected() gp(status, trial_inicio, trial_fim, hotmart_status, hotmart_email)))
  AND NOT (hotmart_status IS DISTINCT FROM (SELECT gp.hotmart_status FROM get_own_profile_protected() gp(status, trial_inicio, trial_fim, hotmart_status, hotmart_email)))
  AND NOT (hotmart_email IS DISTINCT FROM (SELECT gp.hotmart_email FROM get_own_profile_protected() gp(status, trial_inicio, trial_fim, hotmart_status, hotmart_email)))
);