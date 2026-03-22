
-- Tabela de banners
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  link_destino TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger updated_at
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION
  public.update_updated_at_column();

-- RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view banners"
  ON public.banners FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "Admin can manage banners"
  ON public.banners FOR ALL
  TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

-- Bucket público para imagens dos banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true);

CREATE POLICY "Admin can upload banners"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'banners'
    AND public.has_role('admin')
  );

CREATE POLICY "Anyone can view banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');

CREATE POLICY "Admin can delete banners"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'banners'
    AND public.has_role('admin')
  );
