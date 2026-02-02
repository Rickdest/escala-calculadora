-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for admin access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles (only admins can manage, users can read their own)
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Add new columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add new columns to stores table for affiliate commission and campaigns
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS affiliate_commission NUMERIC DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS shopee_campaigns NUMERIC DEFAULT 0;

-- Update default values for stores
ALTER TABLE public.stores ALTER COLUMN shopee_fee_percent SET DEFAULT 20;
ALTER TABLE public.stores ALTER COLUMN shopee_fee_fixed SET DEFAULT 4;
ALTER TABLE public.stores ALTER COLUMN desired_margin SET DEFAULT 17;
ALTER TABLE public.stores ALTER COLUMN taxes SET DEFAULT 0;

-- Add stock and variations to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS has_variations BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]'::jsonb;

-- Create education_content table for admin-editable content
CREATE TABLE public.education_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'video', 'guide', 'offer'
  title TEXT NOT NULL,
  description TEXT,
  content_data JSONB NOT NULL DEFAULT '{}'::jsonb, -- flexible storage for various content types
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on education_content
ALTER TABLE public.education_content ENABLE ROW LEVEL SECURITY;

-- Everyone can read active education content
CREATE POLICY "Anyone can view active education content" ON public.education_content
FOR SELECT USING (is_active = true);

-- Only admins can manage education content
CREATE POLICY "Admins can manage education content" ON public.education_content
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create price_history table for tracking price changes
CREATE TABLE public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  sale_price NUMERIC NOT NULL,
  cost_price NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on price_history
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own price history" ON public.price_history
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own price history" ON public.price_history
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at for education_content
CREATE TRIGGER update_education_content_updated_at
BEFORE UPDATE ON public.education_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default education content
INSERT INTO public.education_content (content_type, title, description, content_data, display_order) VALUES
('video', 'Como Precificar Produtos na Shopee', 'Aprenda a calcular o preço ideal para seus produtos', '{"youtube_id": "dQw4w9WgXcQ"}', 1),
('video', 'Entendendo as Taxas da Shopee', 'Saiba como as taxas impactam seu lucro', '{"youtube_id": "dQw4w9WgXcQ"}', 2),
('video', 'Estratégias de Margem de Lucro', 'Maximize seus ganhos com estratégias inteligentes', '{"youtube_id": "dQw4w9WgXcQ"}', 3),
('guide', 'Guia de Precificação', 'Passo a passo completo para precificar', '{"icon": "Calculator"}', 1),
('guide', 'Análise de Concorrência', 'Como analisar preços dos concorrentes', '{"icon": "TrendingUp"}', 2),
('guide', 'Otimização de Lucros', 'Técnicas para aumentar sua margem', '{"icon": "Target"}', 3),
('offer', 'Curso Completo Shopee', 'Domine a arte de vender na Shopee', '{"video_url": "", "button_text": "Quero Aprender Agora", "button_link": "#", "features": ["Precificação Avançada", "Análise de Mercado", "Estratégias de Venda", "Suporte Exclusivo"]}', 1);

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);