

## Plano: Volume de busca Shopee na aba Tendência

### Objetivo
Aproveitar 100% do que `get_recommended_keyword_list` já devolve, expor as 3 dimensões úteis (volume + quality + bid sugerido), tornar o card mais comparável ao Google Trends e clicável.

### Mudanças

**1. Backend — capturar campos extras** (`supabase/functions/_shared/shopee.ts` + `shopee-ads/index.ts`)
- Hoje persistimos `{ keyword, search_volume, suggested_bid }`. Adicionar `quality_score` e `competition_level` no objeto salvo em `shopee_ads_by_product.keywords[]`.
- Sem migration: a coluna é `jsonb`, só ampliar o shape.

**2. Hook — expor novos campos** (`src/hooks/useProductTrend.ts`)
- Tipo `ShopeeKeyword` ganha `quality_score?: number` e `competition_level?: string`.
- Sem mais query — já vem no mesmo fetch.

**3. UI — refatorar o card "Palavras-chave Shopee"** (`ProductTrendTab.tsx`)
- **Mover para o topo** (acima do `TrendSearchCard` Google Trends), em grid 2-col no desktop (Shopee à esquerda, Google à direita) e empilhado no mobile.
- Cada linha vira um **card-row clicável** com:
  - Palavra + ícone Shopee
  - **Volume 7d** em número absoluto formatado (12.4k) com label "buscas/7d Shopee"
  - **Badge de qualidade** colorida (8-10 verde "alta relevância", 5-7 amarelo "média", <5 cinza "baixa")
  - **Bid sugerido** R$ X,XX (já tinha, manter)
  - **Botão sutil "Analisar no Google"** que chama `setKeywordOverride(kw.keyword)` — reaproveita lógica existente
- Header do card mostra: "Top palavras (volume real Shopee)" + tooltip explicando que vem do app de Ads e é dos últimos 7 dias.
- Mostrar até 8 (hoje 10, mas os últimos 2 raramente importam).

**4. Indicador comparativo no header da aba**
- Se a keyword analisada no Google Trends bater com alguma da lista Shopee, exibir uma faixa fina acima do gráfico: "📊 Esse termo tem **12.4k buscas/7d** na Shopee".
- Match case-insensitive + normalização (sem acentos).

**5. Estado vazio**
- Se `shopeeKeywords.length === 0` (produto sem campanha Ads ou sem `shopee_item_id`): card mostra mensagem curta "Conecte o app Shopee Ads e cadastre uma campanha pra ver volume de busca real" + link `/configuracoes/integracoes`.

### Arquivos editados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/_shared/shopee.ts` (parser de keywords) ou `shopee-ads/index.ts` | Adicionar `quality_score` e `competition_level` no objeto persistido |
| `src/hooks/useProductTrend.ts` | Tipo `ShopeeKeyword` ganha 2 campos opcionais |
| `src/components/products/trend/ProductTrendTab.tsx` | Reordena layout (Shopee no topo em grid 2-col), refaz `shopeeFooter` como `ShopeeKeywordsCard`, adiciona faixa comparativa, empty state |

Sem migration, sem nova edge function, sem mudança em outras telas.

### Trade-offs
- ✅ Aproveita 100% do que a Shopee já devolve sem chamar nada novo
- ✅ Card vira útil de verdade (volume absoluto + qualidade + ação)
- ✅ Mantém Google Trends ao lado (complementar: Google = tendência macro 5y, Shopee = volume real 7d)
- ⚠️ Volume Shopee só aparece se o produto tem `shopee_item_id` E o usuário rodou `shopee-ads` sync — empty state cobre isso
- ⚠️ `quality_score` e `competition_level` podem não vir em todos os retornos (depende da API) — UI esconde graciosamente

