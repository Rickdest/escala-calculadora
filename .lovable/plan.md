

## Diagnóstico

Pelos prints anteriores e estado atual do código:

1. **Trend collapsible fechado por padrão** esconde o que é a ferramenta — usuário não percebe que existe pesquisa de demanda. Usuário pediu pra **abrir por padrão**.
2. **Cards de "Saúde da carteira" ainda parecem amadores**: tamanhos inconsistentes, donut pequeno (96px) com tipografia pequena ao redor, lista do Top 5 com barras finas demais (h-1) e ranks pequenos, stat card de Saúde Financeira com 3 mini-tiles cinzas que ficam apertados no breakpoint atual (878px viewport = quebra em 2 colunas e o 3º card vai pra próxima linha sozinho).

## Plano

### A. Trend aberto por padrão

`Products.tsx`:
- Mudar `useState<boolean>` inicial: se `localStorage` não tiver valor salvo, default = **`true`** (aberto). Só respeitar localStorage quando explicitamente salvo como `'0'`.
- Quando aberto, o header do trigger continua visível (funciona como header da seção) com chevron rotacionado — comunica claramente "esta é uma ferramenta de pesquisa" sem precisar clicar.
- Refinar visual do trigger quando **aberto**: hoje fica neutro demais (`bg-card`). Manter um leve `bg-gradient-to-r from-primary/[0.04] to-transparent` e borda `border-primary/30` pra continuar destacado como ferramenta.

### B. Redesign dos 3 cards de Saúde da carteira

Problema central: viewport 878px cai em `md:grid-cols-2` → quebra layout 2+1 (ruim). 

**Solução grid**: forçar `grid-cols-1 md:grid-cols-3` direto (sem breakpoint intermediário 2-col). Em mobile stack, em desktop 3 lado a lado. Aumentar `min-h` de 260px → **300px** pra cards respirarem.

**MarginDistributionChart** (`AnalyticsCharts.tsx`):
- Aumentar donut de 96px → **128px** com stroke 12 (mais presente)
- Tipografia central: % `text-2xl font-bold` em vez de `text-lg`
- Stat tiles laterais: substituir as 3 linhas finas por 3 **mini-cards verticais** com bg semântico sutil (success/15, warning/15, destructive/15) — pílulas pequenas em vez de linhas
- Footer com "meta: X%" alinhado embaixo

**TopProductsChart** (lista Top 5):
- Aumentar barra de `h-1` → `h-1.5` com gradiente (ex: `from-success to-success/60`)
- Rank: badge circular numerado 20px com cor (1º dourado, 2º prata, 3º bronze, 4-5 cinza) em vez de número solto
- Nome em `text-xs` (era 11px) com mais respiro entre linhas (`space-y-3` em vez de `space-y-2`)
- Linha separadora sutil entre itens

**ProfitSummaryChart** (Saúde financeira):
- Hoje: número grande no topo + 3 mini-tiles cinzas embaixo. Os tiles cinzas escuros desentoam dos outros 2 cards.
- Refazer: lucro consolidado grande no topo (manter), abaixo **2 colunas** de stats (não 3): coluna esquerda "Médio · Mediana", coluna direita "% Lucrativos" com barra de progresso visual horizontal (não só número). Visual mais limpo, mais espaço pra cada métrica respirar.
- Remover bg `surface-2/60` dos mini-tiles → usar `border-t border-border/50` como separador, sem caixinhas internas (mais clean, alinha com estilo dos outros 2)

### C. Header da seção "Saúde da carteira"

- Aumentar `h2` de `text-sm` → `text-base font-semibold`
- Adicionar contador discreto à direita: "3 visões" com chip sutil
- Mais respiro vertical entre header e grid (`space-y-4` em vez de `space-y-3`)

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/pages/Products.tsx` | (1) Default `trendOpen = true` quando não há valor no localStorage; (2) Trigger no estado aberto mantém gradient sutil + border-primary/30; (3) Grid de charts: `grid-cols-1 md:grid-cols-3` (remover breakpoint 2-col); (4) Header "Saúde da carteira" maior + chip contador |
| `src/components/charts/AnalyticsCharts.tsx` | (1) Donut 128px com tipografia maior + stat tiles como pílulas semânticas; (2) Top 5 com badges de rank coloridos + barras h-1.5 gradient + espaçamento maior; (3) Saúde financeira em 2 col com barra de progresso pra "% lucrativos" + remover mini-tiles cinzas; (4) `min-h-[300px]` em todos |

Sem migrações. Sem mudanças no backend.

## Trade-offs

- ✅ Ferramenta de pesquisa visível imediatamente (resolve "não dá pra saber que tem ferramenta ali")
- ✅ Charts maiores e com tipografia respirável — sai do amador
- ✅ Grid 3-col direto evita quebra feia 2+1 no viewport ~880px
- ✅ Visual semântico (cores nos rank badges, barras gradient) eleva o nível
- ⚠️ Trend aberto por padrão consome ~600px da viewport — mitigado: usuário pode fechar e a preferência fica salva
- ⚠️ Cards de 300px min-height aumentam scroll inicial — aceitável, é a seção de análise

