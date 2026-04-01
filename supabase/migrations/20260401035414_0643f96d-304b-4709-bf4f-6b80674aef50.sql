ALTER TABLE products ADD COLUMN IF NOT EXISTS shopee_item_id bigint;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shopee_synced_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS products_shopee_item_id_idx ON products(shopee_item_id) WHERE shopee_item_id IS NOT NULL;