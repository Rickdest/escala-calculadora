ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_inicio TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_fim TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS hotmart_email TEXT,
  ADD COLUMN IF NOT EXISTS hotmart_status TEXT,
  ADD COLUMN IF NOT EXISTS termos_aceitos_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS push_subscription JSONB;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles
    (user_id, email, trial_inicio, trial_fim, status)
  VALUES (
    NEW.id,
    NEW.email,
    now(),
    now() + interval '7 days',
    'trial'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

ALTER TABLE public.products DROP COLUMN IF EXISTS image_url;