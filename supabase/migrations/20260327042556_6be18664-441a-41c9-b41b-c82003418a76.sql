DROP INDEX IF EXISTS idx_ads_data_unique_period;
ALTER TABLE ads_data ADD CONSTRAINT uq_ads_data_period UNIQUE (user_id, nome_produto_csv, periodo_inicio, periodo_fim);