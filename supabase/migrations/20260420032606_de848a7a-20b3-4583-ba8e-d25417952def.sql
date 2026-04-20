-- Tabela de tendências de mercado por produto
CREATE TABLE public.product_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('google_trends', 'shopee_keywords')),
  keyword TEXT NOT NULL,
  period_date DATE NOT NULL,
  interest_score NUMERIC,
  search_volume NUMERIC,
  suggested_bid NUMERIC,
  competition_level TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para queries rápidas
CREATE INDEX idx_product_trends_product_source ON public.product_trends(product_id, source, period_date DESC);
CREATE INDEX idx_product_trends_user ON public.product_trends(user_id);
CREATE INDEX idx_product_trends_captured ON public.product_trends(product_id, captured_at DESC);

-- Garantir um único registro por produto+fonte+keyword+data
CREATE UNIQUE INDEX idx_product_trends_unique 
ON public.product_trends(product_id, source, keyword, period_date);

-- Habilitar RLS
ALTER TABLE public.product_trends ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own product trends"
ON public.product_trends FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own product trends"
ON public.product_trends FOR INSERT TO authenticated
WITH CHECK ((auth.uid() = user_id) AND has_active_subscription());

CREATE POLICY "Users can update own product trends"
ON public.product_trends FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own product trends"
ON public.product_trends FOR DELETE TO authenticated
USING (auth.uid() = user_id);