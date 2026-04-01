
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS draft boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_products_shopee_item_id ON products(shopee_item_id) WHERE shopee_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_draft ON products(draft) WHERE draft = true;
