

## Tudo que o Google Trends (não-oficial) expõe — vale a pena ou não?

### ✅ Vale a pena adicionar (alto valor / baixo custo)

| Dado | Por que vale | Custo |
|---|---|---|
| **Timeframe selector** (7d / 30d / 90d / 12m / 5y) | Detecta buzz recente vs tendência histórica. Hoje só temos 5y, perde-se sazonalidade curta. | 1 chamada extra ao trocar |
| **Comparação multi-termo** (até 5) | Endpoint `multiline` já aceita até 5 termos numa só chamada. Comparar "vestido curto vs longo" é killer feature. | Zero (mesma chamada) |
| **Cidades** (top 10) via `geo=BR&resolution=CITY` | Shopee/TikTok rodam ads por cidade. "Onde vendo melhor?" é decisão de mídia. | 1 chamada extra (lazy) |
| **Países** (`COUNTRY` global) | Para dropshipper / exportador identificar mercado. | 1 chamada extra (lazy) |
| **Momentum 30d** (% últimos 30d vs 30d anteriores) | Calculado da timeline que já temos. Vira badge "+18% no mês". | Zero |
| **Slope / classificação** ("Em alta forte / Crescendo / Estável / Caindo") | Regressão linear sobre a série. Resposta objetiva ao "tá bombando?". | Zero |
| **Pico do ano + recomendação de estoque** | Já temos ciclo sazonal — só faltou interpretar ("pico em out, estoque-se em ago"). | Zero |
| **Forecast 3 meses** (linha tracejada) | Projeção simples baseada no ciclo sazonal médio. | Zero |
| **Categoria detectada** (chip "Moda Feminina") | Endpoint `autocomplete` retorna a taxonomia oficial do termo. | 1 chamada leve |

### ❌ NÃO vale a pena (custo alto, valor baixo, ou inviável)

| Dado | Por que NÃO |
|---|---|
| **Realtime trending stories** | Não filtra por keyword — é feed global do dia. Útil pra portal de notícia, não pra e-commerce. |
| **Trending searches diárias (BR)** | Mesmo problema: agregado nacional do dia. Não responde nada sobre "o produto X". |
| **YouTube Trends** (endpoint separado) | Outro corpo de dados (vídeos), exigiria UI dedicada. Fora do escopo de e-commerce. |
| **Filtro por categoria (`cat=`) nas relacionadas** | Reduz ruído mas raramente muda decisão. Complexidade alta (1.400 categorias) pra ganho marginal. |
| **Topics vs Search terms** (entidade vs string) | Tecnicamente interessante (topic engloba sinônimos), mas confunde o usuário leigo. Mantemos só search terms. |
| **Best day of week** | Só funciona com janela `now 7-d`; com 7 dias o sinal é muito ruidoso pra ser confiável. |
| **DMA (Designated Market Area)** | Conceito de mídia americana, não existe no Brasil — `CITY` cobre o caso. |
| **Histórico "all" (desde 2004)** | 20 anos de série = ruído puro pra produto de e-commerce. 5y já é teto útil. |
| **Embed widget oficial** | Iframe do Google — quebra o design system, sem controle de estilo. |

## O que vai ser construído (versão final)

### Backend (`fetch-product-trends`, modo `keywordOnly`)
Aceitar no body: `timeframe`, `keywords[]` (até 5), `geoResolution` (`REGION`/`CITY`/`COUNTRY`).
Calcular server-side: `momentum30d`, `slope`, `slopeLabel`, `peakMonth`, `stockRecommendation`, `forecast3m`, `categoryHint`.

### Frontend (`useTrendSearch` + `TrendSearchCard`)
- Header com **chips de timeframe** (7d/30d/90d/12m/5y) + **badge momentum** colorido
- Input com botão "**+ comparar**" (até 3 termos visíveis, gráfico vira multi-linha colorida)
- Insight box no topo: slope label + pico + recomendação de estoque
- Gráfico principal com **linha de forecast** tracejada
- Accordion "Cidades (top 10)" — chamada lazy ao expandir
- Accordion "Interesse mundial (top países)" — chamada lazy ao expandir
- Cache key estendido: `keyword|timeframe|geo|compare`

### Arquivos
| Arquivo | Mudança |
|---|---|
| `supabase/functions/fetch-product-trends/index.ts` | Suportar timeframe/keywords[]/geoResolution; calcular momentum, slope, peak, forecast |
| `src/hooks/useTrendSearch.ts` | Novas opções no `search()`, cache key estendido, fns separadas pra cidades/países |
| `src/components/products/TrendSearchCard.tsx` | UI: timeframe chips, comparar termos, insight box, multi-linha, accordions cidades/países |

Sem migrações. Sem mudança no fluxo por-produto.

