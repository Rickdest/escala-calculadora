
CREATE OR REPLACE FUNCTION public.enforce_store_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan text;
  v_limit int;
  v_count int;
BEGIN
  -- Get user's current plan
  SELECT s.plan INTO v_plan
  FROM public.subscriptions s
  WHERE s.user_id = NEW.user_id
    AND s.status = 'active'
  ORDER BY s.updated_at DESC
  LIMIT 1;

  -- Fallback: check legacy profiles
  IF v_plan IS NULL THEN
    PERFORM 1 FROM public.profiles p
    WHERE p.user_id = NEW.user_id AND p.status = 'ativo';
    IF FOUND THEN
      v_plan := 'pro';
    END IF;
  END IF;

  -- Determine limit based on plan
  v_limit := CASE v_plan
    WHEN 'yearly' THEN 7
    WHEN 'monthly' THEN 2
    WHEN 'pro' THEN 2
    ELSE 0
  END;

  -- Count existing stores
  SELECT count(*) INTO v_count
  FROM public.stores
  WHERE user_id = NEW.user_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Store limit reached for plan %. Max: %', COALESCE(v_plan, 'free'), v_limit;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_store_limit_trigger
  BEFORE INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_store_limit();
