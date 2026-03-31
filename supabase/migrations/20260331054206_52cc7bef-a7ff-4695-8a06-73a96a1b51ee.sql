ALTER TABLE product_ads_metrics 
  ADD COLUMN IF NOT EXISTS excel_daily_data jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS excel_summary jsonb DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_pam_excel_user_product 
  ON product_ads_metrics (user_id, product_id) 
  WHERE excel_daily_data IS NOT NULL;