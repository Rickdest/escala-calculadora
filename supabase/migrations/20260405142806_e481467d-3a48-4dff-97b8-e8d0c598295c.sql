
CREATE TABLE IF NOT EXISTS public.product_performance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  nome text,
  period_start date,
  period_end date,
  vendas_pago numeric DEFAULT 0,
  pedidos_pagos integer DEFAULT 0,
  unidades_pagas integer DEFAULT 0,
  compradores_pagos integer DEFAULT 0,
  ticket_medio numeric DEFAULT 0,
  impressoes integer DEFAULT 0,
  cliques integer DEFAULT 0,
  ctr numeric DEFAULT 0,
  taxa_conversao numeric DEFAULT 0,
  taxa_rejeicao numeric DEFAULT 0,
  add_carrinho integer DEFAULT 0,
  taxa_carrinho numeric DEFAULT 0,
  taxa_recompra numeric DEFAULT 0,
  ads_roas numeric,
  ads_gasto numeric,
  ads_gmv numeric,
  ads_pedidos integer,
  ads_impressoes integer,
  ads_cliques integer,
  variacoes jsonb DEFAULT '[]',
  source text DEFAULT 'excel',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(store_id, item_id, period_start, period_end)
);

ALTER TABLE public.product_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own product_performance"
  ON public.product_performance FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own product_performance"
  ON public.product_performance FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND has_active_subscription());

CREATE POLICY "Users can update own product_performance"
  ON public.product_performance FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own product_performance"
  ON public.product_performance FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_product_performance_updated_at
  BEFORE UPDATE ON public.product_performance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
