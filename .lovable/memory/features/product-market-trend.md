---
name: Product Market Trend Module
description: Aba "Tendência" no detalhe do produto com timeline 5 anos do Google Trends, ciclo sazonal mês-a-mês, top regiões (estados), buscas relacionadas top+rising, override manual e validação de qualidade
type: feature
---

Módulo de tendência de mercado por produto na rota `/products/:id`, aba "Tendência".

**Fontes:**
- Google Trends `multiline` (não-oficial, gratuito, cookies + UAs rotativos) — interesse 0-100 últimos **5 anos** (`today 5-y`)
- Google Trends `relatedsearches` — buscas relacionadas TOP (mais frequentes 0-100) e RISING (% crescimento ou "Breakout")
- Google Trends `comparedgeo` — interesse por estado (top 10 BR)
- Ciclo sazonal — calculado server-side: média mês-a-mês (1-12) agregando os 5 anos da timeline
- Shopee Ads `keywords[]` (já em `shopee_ads_by_product.keywords`) — volume real e bid sugerido

**Backend (`fetch-product-trends`):**
- Tabela `product_trends` (RLS dono, insert exige `has_active_subscription()`)
- Sources: `google_trends` (timeline 5y), `google_seasonal_cycle` (12 linhas/produto), `google_geo` (top estados), `google_related_top`, `google_related_rising`, `shopee_keywords`
- Coluna `products.trend_keyword_override` (TEXT) — termo customizado pelo usuário, prioritário sobre extração
- Cache 7d quando `force=false`
- Aceita body: `{ productId, force, keywordOverride? }`
- Retorna: `{ keyword, low_quality, zeros_pct, suggestions, google_saved, shopee_saved, related_saved, regions_saved, cycle_saved, rate_limited, google_error }`
- Para related rising, `interest_score = 9999` quando "Breakout"; metadata guarda `is_breakout`, `formatted_value`, `parent_keyword`
- Para seasonal_cycle, `period_date` é sintético (`{ano_atual}-MM-15`); valor real está em `interest_score` (média) e `metadata.month` + `metadata.samples`

**Algoritmo de extração inteligente (`extractKeyword`):**
1. Remove frases de marketing (empina bumbum, costas abertas, push up, etc.)
2. Tokeniza, remove medidas/números/pontuação
3. Remove stop-words (elegância, premium, original, kit, combo, conectores)
4. Detecta CATEGORIA via dicionário `PRODUCT_CATEGORIES` (~250 itens: moda, casa, beleza, tech, infantil, pet, fitness)
5. Coleta até 2 MODIFICADORES genéricos (`GENERIC_MODIFIERS`: longo, suplex, gamer, etc.)
6. Adiciona PÚBLICO (`AUDIENCES`: feminino, masculino, infantil, unissex)
7. Resultado: `[categoria] + [1-2 modificadores] + [audience]` máx 4 palavras
8. Fallback se não achar categoria: 3 primeiras palavras limpas

**Validação de qualidade:**
- Após buscar Google Trends, calcula % de zeros na série
- Se >80% zeros → `low_quality: true`, gera 3 sugestões priorizando termos REAIS do `relatedTop` + `relatedRising` (fallback: `suggestAlternatives()` algorítmico)
- Frontend esconde gráfico/diagnóstico/ciclo/regiões, mostra aviso + chips clicáveis com sugestões + botão editar manualmente

**Frontend (`ProductTrendTab` + `useProductTrend` + `SeasonalCycleChart` + `RegionsBreakdown`):**
- Header mostra "Termo analisado: X" + badge "personalizado" se override + ícone ✏️ pra editar inline
- Editor: Input + botões check/cancelar; Enter salva, Escape cancela
- Hook expõe: `keyword, keywordOverride, lowQuality, suggestions, relatedTop, relatedRising, regions, seasonalCycle, setKeywordOverride(kw)`
- `setKeywordOverride` chama `refresh(true, kw)` que persiste no backend e re-busca

**Gráfico timeline 5 anos:**
- AreaChart com gradiente, linha de média (ReferenceLine tracejada), ReferenceDot no pico
- Tick formatter adapta: 3+ anos → mostra ano; <3 → mostra mês
- Tooltip CUSTOMIZADO: data por extenso (mês longo + ano), valor grande, badge "PICO" quando aplicável, comparação % vs média do período
- Header mostra Pico e Média lado-a-lado com legenda visual

**Ciclo sazonal (`SeasonalCycleChart`):**
- BarChart com 12 barras (Jan-Dez), agregando média histórica de cada mês
- Cores: mês atual = primary 100%, picos (≥85% do max) = primary 60%, demais = primary 25%
- Header mostra "Picos em [meses]" automaticamente
- Esconde se <6 meses com dados

**Regiões (`RegionsBreakdown`):**
- Lista vertical numerada (01-08) com nome do estado + valor (0-100) + barra de progresso proporcional
- Top 8 estados, ordenado por interesse

**Seção "Oportunidades de mercado":**
- 2 colunas (md+) / stack (mobile), abaixo dos cards de diagnóstico
- **🔥 Em alta agora (rising)** — badge "BOMBANDO" pra Breakout/value≥5000, badge laranja `+X%` pra ≥100, verde pra ≥25
- **🔍 Buscas populares (top)** — score 0-100 com barra de progresso compacta
- Cada item é botão clicável: `setKeywordOverride(kw.keyword)` reanalisa com 1 clique
- Esconde a seção se ambas listas vazias

**Limitações conhecidas:**
- Categorias de nicho (umectação capilar, ferramentas raras) podem não bater no dicionário → fallback ou override manual
- Google Trends é interesse relativo (0-100), não volume absoluto
- Trends pode 429; cookies invalidados nesse caso, retry com backoff (2s/5s/12s)
- Related queries / regions podem vir vazias pra termos muito de nicho — UI esconde a seção graciosamente
- Ciclo sazonal precisa de pelo menos 1 amostra por mês pra aparecer no gráfico (fica 0 se só vier 1 ano)
