
-- Table: estoque_produtos
CREATE TABLE public.estoque_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  categoria text,
  sku_base text,
  descricao text,
  image_url text,
  tem_variacoes boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.estoque_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own estoque_produtos" ON public.estoque_produtos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own estoque_produtos" ON public.estoque_produtos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own estoque_produtos" ON public.estoque_produtos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own estoque_produtos" ON public.estoque_produtos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Table: estoque_variacoes
CREATE TABLE public.estoque_variacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.estoque_produtos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  atributos jsonb NOT NULL DEFAULT '{}'::jsonb,
  sku text,
  preco_custo numeric NOT NULL DEFAULT 0,
  quantidade integer NOT NULL DEFAULT 0,
  quantidade_minima integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.estoque_variacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own estoque_variacoes" ON public.estoque_variacoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own estoque_variacoes" ON public.estoque_variacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own estoque_variacoes" ON public.estoque_variacoes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own estoque_variacoes" ON public.estoque_variacoes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Table: estoque_movimentacoes
CREATE TABLE public.estoque_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variacao_id uuid NOT NULL REFERENCES public.estoque_variacoes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  quantidade integer NOT NULL,
  motivo text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own estoque_movimentacoes" ON public.estoque_movimentacoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own estoque_movimentacoes" ON public.estoque_movimentacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own estoque_movimentacoes" ON public.estoque_movimentacoes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Updated_at triggers
CREATE TRIGGER update_estoque_produtos_updated_at BEFORE UPDATE ON public.estoque_produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_estoque_variacoes_updated_at BEFORE UPDATE ON public.estoque_variacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
