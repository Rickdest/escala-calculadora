ALTER TABLE public.ads_data ADD COLUMN IF NOT EXISTS itens_vendidos_diretos integer DEFAULT 0;
ALTER TABLE public.ads_data ADD COLUMN IF NOT EXISTS conversoes_diretas integer DEFAULT 0;