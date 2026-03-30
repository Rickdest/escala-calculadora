
CREATE TABLE public.shopee_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id bigint NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expire_in integer NOT NULL DEFAULT 0,
  token_created_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

ALTER TABLE public.shopee_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage shopee tokens"
  ON public.shopee_tokens
  FOR ALL
  TO authenticated
  USING (public.has_role('admin'::app_role))
  WITH CHECK (public.has_role('admin'::app_role));
