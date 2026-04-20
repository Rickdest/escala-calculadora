ALTER TABLE public.product_trends DROP CONSTRAINT IF EXISTS product_trends_source_check;

ALTER TABLE public.product_trends ADD CONSTRAINT product_trends_source_check CHECK (
  source = ANY (ARRAY[
    'google_trends'::text,
    'shopee_keywords'::text,
    'google_seasonal_cycle'::text,
    'google_related_top'::text,
    'google_related_rising'::text,
    'google_geo'::text,
    'meta_no_data'::text
  ])
);