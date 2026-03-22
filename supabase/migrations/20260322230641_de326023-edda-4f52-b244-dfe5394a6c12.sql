
-- Step 1: Rename columns
ALTER TABLE public.subscriptions RENAME COLUMN hotmart_transaction_id TO cakto_order_id;
ALTER TABLE public.subscriptions RENAME COLUMN hotmart_subscription_id TO cakto_subscription_id;
ALTER TABLE public.profiles RENAME COLUMN hotmart_email TO payment_email;
ALTER TABLE public.profiles RENAME COLUMN hotmart_status TO payment_status;

-- Step 2: Drop and recreate functions
DROP FUNCTION IF EXISTS public.get_own_profile_protected();
DROP FUNCTION IF EXISTS public.update_subscription_status(uuid, text, timestamp with time zone, text, text);

CREATE FUNCTION public.get_own_profile_protected()
 RETURNS TABLE(status text, trial_inicio timestamp with time zone, trial_fim timestamp with time zone, payment_status text, payment_email text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT p.status, p.trial_inicio, p.trial_fim, p.payment_status, p.payment_email
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1
$$;

CREATE FUNCTION public.update_subscription_status(p_user_id uuid, p_status text, p_trial_fim timestamp with time zone DEFAULT NULL, p_payment_email text DEFAULT NULL, p_payment_status text DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET
    status = p_status,
    trial_fim = COALESCE(p_trial_fim, trial_fim),
    payment_email = COALESCE(p_payment_email, payment_email),
    payment_status = COALESCE(p_payment_status, payment_status),
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- Step 3: Update RLS policy
DROP POLICY IF EXISTS "Users can update own profile safe" ON public.profiles;
CREATE POLICY "Users can update own profile safe"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  (auth.uid() = user_id)
  AND (NOT (status IS DISTINCT FROM (SELECT p.status FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (trial_inicio IS DISTINCT FROM (SELECT p.trial_inicio FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (trial_fim IS DISTINCT FROM (SELECT p.trial_fim FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (payment_status IS DISTINCT FROM (SELECT p.payment_status FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (payment_email IS DISTINCT FROM (SELECT p.payment_email FROM profiles p WHERE p.user_id = auth.uid())))
);
