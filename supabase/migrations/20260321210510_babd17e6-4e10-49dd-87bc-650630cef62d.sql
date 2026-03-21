
CREATE TABLE public.home_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_label TEXT,
  cta_url TEXT,
  bg_class TEXT DEFAULT 'bg-primary',
  text_class TEXT DEFAULT 'text-primary-foreground',
  emoji TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.home_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active banners"
  ON public.home_banners FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage banners"
  ON public.home_banners FOR ALL
  TO authenticated
  USING (public.has_role('admin'::app_role))
  WITH CHECK (public.has_role('admin'::app_role));

INSERT INTO public.home_banners (title, subtitle, cta_label, cta_url, bg_class, text_class, emoji, display_order) VALUES
('Análise de Ads disponível', 'Importe seu CSV da Shopee e veja o ROAS real de cada produto', 'Acessar →', '/roas', 'bg-primary', 'text-primary-foreground', '📊', 1),
('Controle seu Estoque', 'Cadastre produtos e receba alertas automáticos de reposição', 'Ver Estoque →', '/stock', 'bg-surface-2', 'text-foreground', '📦', 2);
