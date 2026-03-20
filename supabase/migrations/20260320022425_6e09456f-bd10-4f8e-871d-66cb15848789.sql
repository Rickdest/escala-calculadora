
-- Fix handle_new_user trigger with ON CONFLICT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    trial_inicio,
    trial_fim,
    status
  )
  VALUES (
    NEW.id,
    NEW.email,
    now(),
    now() + interval '7 days',
    'trial'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add unique constraint on user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Fix existing profiles with null trial data
UPDATE public.profiles
SET
  trial_inicio = created_at,
  trial_fim = created_at + interval '7 days',
  status = 'trial'
WHERE
  trial_inicio IS NULL
  OR trial_fim IS NULL
  OR status IS NULL;
