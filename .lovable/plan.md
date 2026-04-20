

## Análise: o que dá pra puxar de tendência de mercado

Como a Seller API só funciona pra sua conta (não dá pra usar como base de mercado externo), e os dados de pedidos da sua loja não representam "mercado", precisamos buscar fontes externas. Vou listar o que é viável:

### Fontes possíveis

**1. Shopee Ads — Keyword Suggestions API (já temos integrada)**
Já usamos via `shopee-ads` edge function. Retorna por palavra-chave:
- `search_volume` — volume de busca real **na Shopee** (mercado interno)
- `suggested_bid` — bid sugerido (proxy de competitividade)
- `quality_score`, `competition_level`
- Limitação: precisa partir de uma keyword (do nome do produto). Não dá histórico temporal — é snapshot atual.

**2. Google Trends (não-oficial, gratuito)**
Endpoint público `trends.google.com/trends/api/explore`:
- Interesse relativo 0-100 nos últimos 12 meses
- Sazonalidade, picos, quedas, comparativo entre termos
- Sem custo, mas instável (rate limit 429 frequente, precisa retry + cache)
- É **interesse macro** (Google inteiro, não só Shopee)

**3. Combinação dos dois (recomendado)**
- Shopee Keywords = "quanto buscam HOJE dentro do canal de venda"
- Google Trends = "tendência macro nos últimos 12 meses, sazonalidade, quando vai bombar"

### O que dá pra construir

**Aba "Tendência de Mercado" no produto:**

1. **Curva 12 meses (Google Trends)**
   - Linha de interesse 0-100 do termo principal do produto
   - Marcadores de pico (mês mais alto) e vale (mês mais baixo)
   - Comparativo ano vs ano se houver histórico

2. **Volume Shopee atual (Ads Keyword API)**
   - Top 10 palavras relacionadas com volume de busca
   - Bid sugerido (oportunidade vs saturação)
   - Tag "Alta demanda / Média / Baixa" baseado na distribuição

3. **Diagnóstico automático**
   - "📈 Tendência: subindo" (slope positivo nos últimos 90d Google)
   - "🔥 Pico esperado em ~30 dias" (baseado em sazonalidade do ano anterior)
   - "💎 Oportunidade: volume alto na Shopee + bid baixo"
   - "⚠️ Mercado saturado: bid 3x acima da média"

4. **Sugestões acionáveis**
   - "Reforce estoque antes de [mês]"
   - "Considere boost de orçamento Ads"
   - "Pause ads — interesse em queda há 60 dias"

### O que precisa ser construído

**Backend:**
- Tabela `product_trends`: `product_id, source, keyword, period_date, interest_score, search_volume, captured_at`
- Edge function `fetch-product-trends`:
  - Recebe `product_id`
  - Extrai keyword principal do nome do produto (limpa "Kit", "Pacote 10un", etc.)
  - Chama Google Trends (com retry exponencial + cache 7 dias)
  - Reaproveita keywords Shopee já em `shopee_ads_by_product.keywords`
  - Salva série temporal
- Botão "Atualizar tendência" manual no produto (cache de 7 dias evita abuso)

**Frontend (em `/products/:id`):**
- Nova aba **"Tendência"** entre as abas existentes
- `TrendChart` — linha 12 meses com Recharts (já no projeto)
- `MarketDiagnosticCard` — pílula de status + texto explicativo
- `ShopeeKeywordsPanel` — top 10 keywords com volume + bid
- `SeasonalityIndicator` — barra horizontal mostrando intensidade por mês

### Limitações honestas

| Limite | Por que |
|---|---|
| Google Trends é interesse relativo, não volume absoluto | API pública gratuita não retorna volume real |
| Não conseguimos volume de busca de outras plataformas (TikTok, ML) | Sem API gratuita para isso |
| Tradução de "produto" para "keyword" pode falhar em produtos genéricos | "Camisa azul" vai trazer ruído; "Cafeteira italiana 6 xícaras" funciona melhor |
| Google Trends pode falhar (429) — precisa fallback gracioso | Mostramos só os dados Shopee se Trends cair |

### Esforço estimado

| Etapa | Esforço |
|---|---|
| Migration `product_trends` + índices | Baixo |
| Edge function Google Trends + extração de keyword + cache | Médio (Trends é instável) |
| Reaproveitar keywords Shopee | Baixo |
| UI: aba + gráfico + cards | Médio |
| Diagnóstico automático (sazonalidade + slope) | Baixo |

### Fluxo do usuário

1. Usuário entra em `/products/:id` → clica aba "Tendência"
2. Se nunca foi buscado: mostra botão "Analisar tendência deste produto"
3. Edge function busca Google Trends + Shopee Keywords (5-15s)
4. Renderiza: gráfico 12m + top keywords + diagnóstico
5. Cache de 7 dias (botão "Atualizar" reroda manual)

### Pergunta antes de implementar

Antes de fechar o plano técnico, preciso confirmar 2 pontos:

