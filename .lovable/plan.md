

## Entendendo o pedido

O usuário quer 2 coisas na aba **Análise** (`/products` → tab Análise):

1. **Melhorar o design** geral (visual mais polido, estilo Claude Designer)
2. **Adicionar busca de tendência avulsa** — um campo onde digita qualquer termo (ex: "vestido feminino", "tênis nike") e recebe a mesma análise de tendência que aparece no detalhe do produto (gráfico 5 anos, ciclo sazonal, regiões, buscas relacionadas) — **sem precisar cadastrar o produto**.

## Análise técnica

**Como funciona hoje a tendência por produto:**
- `useProductTrend(productId)` → chama edge function `fetch-product-trends` com `{ productId, force, keywordOverride? }`
- A function persiste em `product_trends` (RLS por `user_id` + `product_id`)
- Retorna timeline Google Trends, ciclo sazonal, regiões, related top/rising

**Problema pra busca avulsa:** a tabela e a function exigem `product_id`. Pra busca livre, precisamos de um caminho que **não persista** (ou persista num bucket separado) e use só keyword.

## Solução

### Parte A — Backend: modo "keyword-only"

Adicionar suporte na edge function `fetch-product-trends` para receber `{ keywordOnly: string }` (sem `productId`). Nesse modo:
- Pula `extractKeyword` (usa o termo direto)
- Pula `buildKeywordCascade` por padrão (respeita o que o usuário digitou)
- **Não persiste no banco** — retorna tudo inline na response: `{ google_series, related_top, related_rising, regions, seasonal_cycle, low_quality, suggestions }`
- Aceita opcional `forceCascade: true` se a primeira tentativa der vazio

Vantagens: zero migração, sem lixo no banco, sem necessidade de tornar `product_id` nullable em `product_trends`.

### Parte B — Hook novo: `useTrendSearch`

Espelha a interface do `useProductTrend` mas:
- `search(keyword)` → chama function com `{ keywordOnly: keyword }`
- Mantém estado local (sem `loadFromDb`)
- Cache em memória das últimas 5 buscas (sessão), pra alternar rápido sem refazer chamada
- Expõe: `searching, googleSeries, relatedTop, relatedRising, regions, seasonalCycle, lowQuality, suggestions, search(kw), clear()`

### Parte C — UI: novo card "Pesquisar tendência" no topo da aba Análise

Posicionado **logo abaixo do hero de KPIs**, antes dos charts existentes. Padrão Claude Designer:

```
┌─────────────────────────────────────────────────────┐
│ 🔍 Pesquisar tendência de mercado                   │
│ Descubra o interesse por qualquer produto, sem      │
│ precisar cadastrar.                                 │
│                                                     │
│ [ vestido feminino...              ] [ Analisar ]   │
│                                                     │
│ Tente: vestido feminino · tênis nike · cropped       │
└─────────────────────────────────────────────────────┘
```

Quando o usuário pesquisa:
- Card **expande inline** mostrando: gráfico 5 anos compacto + ciclo sazonal + top regiões + buscas em alta
- Reusa os componentes `SeasonalCycleChart` e `RegionsBreakdown` (já existem, são genéricos por dados)
- Botão "✕ Limpar" / "🔁 Nova busca"
- Loading state com skeleton estilo Claude

### Parte D — Polimento visual da aba Análise

Pequenos ajustes pra fechar o look Claude Designer:
- **Hero de KPIs**: aumentar `border-l` semântica (atual já tem mas em mobile some); adicionar microcopy `meta 15%`, `32 produtos` etc com mais consistência tipográfica
- **Cards "Melhor/Pior margem"**: trocar emoji `🏆/⚠️` por ícones lucide (`Trophy`, `AlertTriangle`) com cor semântica; adicionar seta `→` indicando clicável
- **Charts**: padronizar header `section-label` em todos 3, mostrar valor sumário à direita (já parcial)
- **Ranking "Atenção"**: o chip "Atenção (31)" tá amarelo; OK
- **Filtros**: adicionar chip "Saudáveis (X)" e "Prejuízo (Y)" caso tenha — hoje só mostra os que existem? (verificar)

## Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/fetch-product-trends/index.ts` | Aceitar `keywordOnly` no body; rota alternativa que não persiste e retorna tudo inline |
| `src/hooks/useTrendSearch.ts` | **Novo hook** pra busca avulsa, cache em memória |
| `src/components/products/TrendSearchCard.tsx` | **Novo componente** card de busca + resultados inline |
| `src/pages/Products.tsx` | Inserir `<TrendSearchCard />` após o hero de KPIs na aba Análise; pequenos ajustes visuais (ícones, microcopy) |

Sem migrações de banco. Reusa `SeasonalCycleChart` e `RegionsBreakdown` existentes.

## Trade-offs

- ✅ Funcionalidade nova de alto valor (descoberta de produtos antes de cadastrar)
- ✅ Sem persistência → sem lixo no banco, sem custos de storage
- ✅ Reusa componentes de tendência existentes (consistência visual garantida)
- ⚠️ Cada busca avulsa custa 1 chamada Google Trends (~3-8s + risco de rate-limit) — mitigado por cache em memória de 5 buscas/sessão
- ⚠️ Sem histórico persistente — usuário perde busca ao recarregar (aceitável: é exploratório)
- ⚠️ Adiciona ~200px de altura na aba — colocado num card colapsável (começa minimizado se usuário já buscou antes via `localStorage` flag)

