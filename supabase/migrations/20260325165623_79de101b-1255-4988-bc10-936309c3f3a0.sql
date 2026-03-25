
CREATE OR REPLACE FUNCTION public.has_active_subscription()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_found boolean;
BEGIN
  -- Check active paid subscription only (no trial)
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = auth.uid()
      AND status = 'active'
  ) INTO v_found;

  IF v_found THEN
    RETURN true;
  END IF;

  -- Check legacy "ativo" status in profiles
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND status = 'ativo'
  ) INTO v_found;

  RETURN v_found;
END;
$function$;
