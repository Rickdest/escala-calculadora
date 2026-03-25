CREATE UNIQUE INDEX IF NOT EXISTS idx_ads_data_unique_period 
ON ads_data (user_id, nome_produto_csv, periodo_inicio, periodo_fim)
WHERE nome_produto_csv IS NOT NULL;