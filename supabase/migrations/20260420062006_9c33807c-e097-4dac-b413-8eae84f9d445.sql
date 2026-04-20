-- 1) Cleanup legacy placeholder UUIDs in subscriptions so they can match by email going forward.
UPDATE public.subscriptions
SET user_id = NULL
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 2) Trigger function: on new auth user, link any subscription rows created
--    earlier by webhook with the same email.
CREATE OR REPLACE FUNCTION public.reconcile_subscription_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.subscriptions
    SET user_id = NEW.id,
        updated_at = now()
    WHERE user_id IS NULL
      AND lower(email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_reconcile_subscriptions ON auth.users;
CREATE TRIGGER on_auth_user_created_reconcile_subscriptions
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.reconcile_subscription_to_user();