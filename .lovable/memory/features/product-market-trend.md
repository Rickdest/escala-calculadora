---
name: Product Market Trend Module
description: Aba "Tendência" no detalhe do produto combinando Google Trends (12 meses) e Shopee Ads keywords, edge function fetch-product-trends, cache de 7 dias
type: feature
---

Módulo de tendência de mercado por produto na rota `/products/:id`, aba "Tendência".

**Fontes:**
- Google Trends (não-oficial, gratuito) — interesse 0-100 nos últimos 12 meses, com retry exponencial 3x
- Shopee Ads `keywords[]` (já em `shopee_ads_by_product.keywords`) — volume real e bid sugerido

**Backend:**
- Tabela `product_trends` (RLS: dono apenas, insert exige `has_active_subscription()`)
- Unique index em `(product_id, source, keyword, period_date)` evita duplicados
- Edge function `fetch-product-trends` (verify_jwt=false, valida JWT no código via auth.getUser)
- Cache de 7 dias: se houver registro recente e `force=false`, retorna cached
- Extração de keyword via `extractKeyword()` — limpa "kit/pacote/un/dimensões/números"

**Frontend:**
- `useProductTrend(productId)` — carrega + permite refresh, calcula diagnóstico (slope 90d, pico/vale, próximo pico esperado, sazonalidade > 40%)
- `ProductTrendTab` — estado vazio com CTA "Analisar tendência", gráfico Recharts 12m, top 10 keywords classificadas por volume (Alta/Média/Baixa)

**Limitações conhecidas:**
- Google Trends é interesse relativo (0-100), não volume absoluto
- Trends pode falhar (429); fallback exibe só dados Shopee
- Produtos genéricos ("camisa azul") trazem ruído; específicos funcionam melhor
