-- 1. Drop permissive policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 2. Create helper function to read protected fields (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.get_own_profile_protected()
RETURNS TABLE(status text, trial_inicio timestamptz, trial_fim timestamptz, hotmart_status text, hotmart_email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.status, p.trial_inicio, p.trial_fim, p.hotmart_status, p.hotmart_email
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1
$$;

-- 3. New restricted UPDATE policy — user cannot change subscription fields
CREATE POLICY "Users can update own profile safe" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status IS NOT DISTINCT FROM (SELECT gp.status FROM public.get_own_profile_protected() gp)
    AND trial_fim IS NOT DISTINCT FROM (SELECT gp.trial_fim FROM public.get_own_profile_protected() gp)
    AND trial_inicio IS NOT DISTINCT FROM (SELECT gp.trial_inicio FROM public.get_own_profile_protected() gp)
    AND hotmart_status IS NOT DISTINCT FROM (SELECT gp.hotmart_status FROM public.get_own_profile_protected() gp)
    AND hotmart_email IS NOT DISTINCT FROM (SELECT gp.hotmart_email FROM public.get_own_profile_protected() gp)
  );

-- 4. New restricted INSERT policy — only allows standard trial values
CREATE POLICY "Users can insert own profile safe" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'trial'
    AND trial_fim <= (now() + interval '8 days')
    AND trial_fim >= (now() + interval '6 days')
  );

-- 5. Revoke direct UPDATE on sensitive columns from authenticated users
REVOKE UPDATE (status, trial_inicio, trial_fim, hotmart_email, hotmart_status) ON public.profiles FROM authenticated;

-- 6. Create secure function for backend to update subscription fields
CREATE OR REPLACE FUNCTION public.update_subscription_status(
  p_user_id UUID,
  p_status TEXT,
  p_trial_fim TIMESTAMPTZ DEFAULT NULL,
  p_hotmart_email TEXT DEFAULT NULL,
  p_hotmart_status TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    status = p_status,
    trial_fim = COALESCE(p_trial_fim, trial_fim),
    hotmart_email = COALESCE(p_hotmart_email, hotmart_email),
    hotmart_status = COALESCE(p_hotmart_status, hotmart_status),
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Restrict execution to service_role only
REVOKE EXECUTE ON FUNCTION public.update_subscription_status FROM public, authenticated;

-- 7. Update has_active_subscription to validate trial_inicio
CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_found boolean;
BEGIN
  -- Check active paid subscription
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = auth.uid()
      AND (
        status = 'active'
        OR (status = 'trialing' AND trial_end > now())
      )
  ) INTO v_found;

  IF v_found THEN
    RETURN true;
  END IF;

  -- Check valid trial in profiles (with inicio validation)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND status = 'trial'
      AND trial_fim > now()
      AND trial_inicio >= (now() - interval '8 days')
  ) INTO v_found;

  RETURN v_found;
END;
$$;