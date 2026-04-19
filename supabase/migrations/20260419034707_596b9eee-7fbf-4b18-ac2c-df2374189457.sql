-- ============================================================
-- 1) shopee_auth_states: DELETE policy + UNIQUE constraint
-- ============================================================

-- Allow users to delete their own state tokens
CREATE POLICY "Users can delete own auth state"
ON public.shopee_auth_states
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Prevent duplicate active states per (user, app_type, store_id)
-- Use partial unique index keyed by created_at not possible (immutable),
-- so use plain unique on (user_id, app_type, COALESCE(store_id, '00000000-0000-0000-0000-000000000000'))
CREATE UNIQUE INDEX IF NOT EXISTS shopee_auth_states_user_apptype_store_uniq
ON public.shopee_auth_states (
  user_id,
  app_type,
  COALESCE(store_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- ============================================================
-- 2) Storage: restrict listing on product-images and banners
-- ============================================================

-- Drop existing permissive SELECT policies on product-images / banners (if present)
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Banners publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view banners" ON storage.objects;

-- product-images: users can list ONLY their own folder
CREATE POLICY "Users can list own product images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- banners: only admins can list (URLs continue to work via public bucket access)
CREATE POLICY "Admins can list banners"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'banners'
  AND public.has_role('admin'::public.app_role)
);

-- ============================================================
-- 4) enforce_store_limit: align with new plan literals
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_store_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan text;
  v_limit int;
  v_count int;
BEGIN
  SELECT s.plan INTO v_plan
  FROM public.subscriptions s
  WHERE s.user_id = NEW.user_id
    AND s.status = 'active'
  ORDER BY s.updated_at DESC
  LIMIT 1;

  IF v_plan IS NULL THEN
    PERFORM 1 FROM public.profiles p
    WHERE p.user_id = NEW.user_id AND p.status = 'ativo';
    IF FOUND THEN
      v_plan := 'pro';
    END IF;
  END IF;

  -- Normalize plan literals to limits
  v_limit := CASE lower(COALESCE(v_plan, ''))
    WHEN 'yearly' THEN 7
    WHEN 'pro_yearly' THEN 7
    WHEN 'skalify_pro' THEN 7
    WHEN 'pro' THEN 7
    WHEN 'monthly' THEN 2
    WHEN 'essencial' THEN 2
    WHEN 'essencial_mensal' THEN 2
    WHEN 'essencial_monthly' THEN 2
    ELSE 0
  END;

  SELECT count(*) INTO v_count
  FROM public.stores
  WHERE user_id = NEW.user_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Store limit reached for plan %. Max: %', COALESCE(v_plan, 'free'), v_limit;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- 6) Reconcile subscription_events.user_id on profile creation
-- ============================================================

CREATE OR REPLACE FUNCTION public.reconcile_subscription_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.subscription_events
    SET user_id = NEW.user_id
    WHERE user_id IS NULL
      AND lower(email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS reconcile_subscription_events_trigger ON public.profiles;
CREATE TRIGGER reconcile_subscription_events_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.reconcile_subscription_events();

-- ============================================================
-- 9) products.shopee_sale_price snapshot for "manually edited" UI badge
-- ============================================================

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS shopee_sale_price numeric;

-- ============================================================
-- M5) Composite indexes for dashboard queries
-- ============================================================

CREATE INDEX IF NOT EXISTS ads_data_user_periodo_fim_idx
ON public.ads_data (user_id, periodo_fim DESC);

CREATE INDEX IF NOT EXISTS product_performance_user_period_end_idx
ON public.product_performance (user_id, period_end DESC);

CREATE INDEX IF NOT EXISTS shopee_ads_by_product_user_store_period_idx
ON public.shopee_ads_by_product (user_id, store_id, period_end DESC);
