ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description text DEFAULT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock_quantity integer DEFAULT 5;