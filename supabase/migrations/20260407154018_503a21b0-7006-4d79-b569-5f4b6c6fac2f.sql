-- 1. Corrigir o trigger para novos cadastros
CREATE OR REPLACE FUNCTION public.handle_new_user_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, email, status, plan)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'free',
    'free'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Revogar acesso de quem nunca pagou
UPDATE public.subscriptions
SET status = 'free', plan = 'free', updated_at = now()
WHERE status = 'active'
  AND plan = 'monthly'
  AND cakto_order_id IS NULL
  AND cakto_subscription_id IS NULL;