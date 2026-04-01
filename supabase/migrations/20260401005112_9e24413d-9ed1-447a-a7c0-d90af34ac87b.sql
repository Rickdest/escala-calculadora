
-- Table to track OAuth state tokens for Shopee integration
CREATE TABLE public.shopee_auth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  state TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Auto-cleanup old states (older than 10 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_old_shopee_states()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.shopee_auth_states WHERE created_at < now() - interval '10 minutes';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_shopee_states
  AFTER INSERT ON public.shopee_auth_states
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_shopee_states();

-- Enable RLS
ALTER TABLE public.shopee_auth_states ENABLE ROW LEVEL SECURITY;

-- Users can insert their own state
CREATE POLICY "Users can insert own auth state"
  ON public.shopee_auth_states FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own state
CREATE POLICY "Users can view own auth state"
  ON public.shopee_auth_states FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role needs full access (for callback to read/delete)
-- No explicit policy needed as service_role bypasses RLS
