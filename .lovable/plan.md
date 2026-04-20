

## Mudanças

1. **Default 12m** em vez de 5y no `TrendSearchCard`
2. **Polimento de layout** dos insights e header

### 1. Período padrão = 12m

`TrendSearchCard.tsx`:
- `useState<Timeframe>("today 5-y")` → `useState<Timeframe>("today 12-m")`
- Mesma mudança no auto-search inicial (quando `initialKeyword` dispara)
- `useTrendSearch.ts`: default do `timeframe` em `search()` muda de `"today 5-y"` → `"today 12-m"`

Trade-off: alguns insights só fazem sentido com 5y (ciclo sazonal completo, vsLastYear, vsAllTimePeak). Solução: o backend já calcula tudo a partir da série recebida — em 12m teremos ciclo parcial e `vsLastYear` pode ficar null. Ajustar UI pra **esconder cards que vierem null** (já tem essa lógica no grid, manter).

### 2. Polimento de layout (baseado nos prints 259/260/261)

**Header / faixa do termo (print 259)**
- Hoje a faixa "Termo analisado: calça feminina [personalizado] [✏️]" + botão "Atualizar" estão soltos visualmente. Agrupar num **card sutil** (`surface-card-subtle p-3 rounded-lg`) com:
  - Linha 1: ícone + "Termo analisado" label + valor + chip "personalizado" + lápis
  - Linha 2: "Atualizado em..." em micro + botão Atualizar à direita alinhado
- Remover o input "calça feminina [×] [Analisar]" duplicado quando `variant=embedded` — já temos a faixa do termo acima, o segundo input confunde. Deixar só um botão "Trocar termo de análise" discreto que abre input inline

**Hero "Potencial de mercado" (print 260)**
- Hoje: número 49 grande + barra laranja + label "Mercado morno" no canto. Funciona mas pesado.
- Melhorar:
  - Layout horizontal mais compacto: `[gauge circular 64px] | número + label | barra fina | "estimativa composta" tooltip`
  - Cor da barra/gauge dinâmica: vermelho <30, laranja 30-60, verde >60 (hoje é só laranja)
  - Reduzir altura de ~120px → ~80px

**Grid de 6 cards (print 260)**
- Hoje: 3 colunas, cards meio largos, ícone+label+valor empilhados, alguns com border colorida outros não — inconsistente
- Melhorar:
  - Padronizar todos com `border` neutra + accent só no ícone (chip colorido 28px)
  - 2 linhas: emoji/ícone com bg semântico à esquerda + label micro + valor h-bold à direita
  - Adicionar 7º card "Próx pico sazonal" (mês com maior crescimento mês-a-mês — já temos `bestGrowthMonth` no backend)

**Banner de ação (print 260)**
- Hoje: faixa horizontal com ícone lâmpada + texto corrido. OK mas plain.
- Melhorar: dividir em 2 partes — `[ícone gradient] | Diagnóstico (1ª frase em bold) + Ação recomendada (2ª frase muted)`. Adicionar borda sutil `border-l-2 border-primary/40`

**Gráfico (print 260)**
- Hoje: bom, mas legenda do eixo X com `abr/25, mai/25...` repete demais (dezembro aparece 2x — bug de tick). Aumentar `minTickGap` em 12m de 25 → 35
- Adicionar pequena legenda "média" perto da linha tracejada

**Ciclo sazonal + Onde mais procuram (print 261)**
- Já bem desenhados, manter
- Pequeno: o card "Ciclo sazonal" tem muito espaço vazio embaixo da legenda. Reduzir min-height ou alinhar melhor com o card vizinho via `grid-rows-[auto]`

**Cidades / Países accordions (print 261)**
- Hoje: dois accordions empilhados ocupando linha cheia cada
- Melhorar: colocar lado a lado em desktop (`md:grid-cols-2`), empilhados em mobile

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/products/TrendSearchCard.tsx` | Default 12m, hero compacto, grid 7 cards padronizado, banner ação refinado, accordions cidades/países lado a lado, esconder input quando embedded |
| `src/components/products/trend/ProductTrendTab.tsx` | Faixa do termo agrupada num card subtle |
| `src/hooks/useTrendSearch.ts` | Default `timeframe` = `"today 12-m"` |

Sem migrações. Sem mudança no backend.

