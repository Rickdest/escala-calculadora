-- Add image_url column to products table for Storage URLs
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;