-- Fix trial: new users get status 'active' with trial period instead of 'trialing'
CREATE OR REPLACE FUNCTION public.handle_new_user_trial()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (user_id, email, status, plan, trial_start, trial_end)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'active',
    'monthly',
    now(),
    now() + interval '7 days'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;