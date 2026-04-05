
-- Jobs table for async ads import
CREATE TABLE public.shopee_ads_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  result jsonb DEFAULT NULL,
  error text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shopee_ads_import_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view own import jobs"
  ON public.shopee_ads_import_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own jobs
CREATE POLICY "Users can insert own import jobs"
  ON public.shopee_ads_import_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND has_active_subscription());

-- Only backend (service_role) can update jobs
CREATE POLICY "Deny client updates on import jobs"
  ON public.shopee_ads_import_jobs FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny client deletes on import jobs"
  ON public.shopee_ads_import_jobs FOR DELETE
  TO authenticated
  USING (false);
