CREATE TABLE public.profit_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT,
  period_start DATE,
  period_end DATE,
  report_type TEXT NOT NULL,
  granularity TEXT NOT NULL DEFAULT 'day',
  avg_cost_pct NUMERIC,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  total_fees NUMERIC NOT NULL DEFAULT 0,
  total_taxes NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  total_profit NUMERIC NOT NULL DEFAULT 0,
  margin_pct NUMERIC NOT NULL DEFAULT 0,
  raw_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profit_analyses TO authenticated;
GRANT ALL ON public.profit_analyses TO service_role;

ALTER TABLE public.profit_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profit analyses"
ON public.profit_analyses FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profit_analyses_updated_at
BEFORE UPDATE ON public.profit_analyses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_profit_analyses_user_store ON public.profit_analyses(user_id, store_id, created_at DESC);