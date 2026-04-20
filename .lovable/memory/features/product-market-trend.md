---
name: Product Market Trend Module
description: Aba "Tendência" no detalhe do produto com extração inteligente de keyword, override manual, validação de qualidade (>80% zeros = low_quality) e sugestões alternativas
type: feature
---

Módulo de tendência de mercado por produto na rota `/products/:id`, aba "Tendência".

**Fontes:**
- Google Trends (não-oficial, gratuito, cookies + UAs rotativos) — interesse 0-100 últimos 12m
- Shopee Ads `keywords[]` (já em `shopee_ads_by_product.keywords`) — volume real e bid sugerido

**Backend (`fetch-product-trends`):**
- Tabela `product_trends` (RLS dono, insert exige `has_active_subscription()`)
- Coluna `products.trend_keyword_override` (TEXT) — termo customizado pelo usuário, prioritário sobre extração
- Cache 7d quando `force=false`
- Aceita body: `{ productId, force, keywordOverride? }` — se `keywordOverride` vier, persiste em `products` antes da busca
- Retorna: `{ keyword, low_quality, zeros_pct, suggestions, google_saved, shopee_saved, rate_limited, google_error }`

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
- Se >80% zeros → `low_quality: true`, gera 3 sugestões via `suggestAlternatives()`
- Frontend esconde gráfico/diagnóstico, mostra aviso + chips clicáveis com sugestões + botão editar manualmente

**Frontend (`ProductTrendTab` + `useProductTrend`):**
- Header mostra "Termo analisado: X" + badge "personalizado" se override + ícone ✏️ pra editar inline
- Editor: Input + botões check/cancelar; Enter salva, Escape cancela
- Hook expõe: `keyword, keywordOverride, lowQuality, suggestions, setKeywordOverride(kw)`
- `setKeywordOverride` chama `refresh(true, kw)` que persiste no backend e re-busca

**Limitações conhecidas:**
- Categorias de nicho (umectação capilar, ferramentas raras) podem não bater no dicionário → fallback ou override manual
- Google Trends é interesse relativo (0-100), não volume absoluto
- Trends pode 429; cookies invalidados nesse caso, retry com backoff (2s/5s/12s)
