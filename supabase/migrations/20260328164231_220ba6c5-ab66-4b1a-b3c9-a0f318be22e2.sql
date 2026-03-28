CREATE TABLE public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  event_type text NOT NULL,
  order_id text,
  status_before text,
  status_after text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view subscription events"
  ON public.subscription_events FOR SELECT
  TO authenticated
  USING (public.has_role('admin'::app_role));