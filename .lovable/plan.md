

## Plano: Melhorar layout da Performance + expandir inline

### Problemas identificados
1. **Estado vazio fraco**: tela branca com botão "Atualizar" pequeno e apagado — não convida a ação
2. **KPIs genéricos**: sem destaque visual suficiente, valores sem formatação atrativa
3. **Popup corta o fluxo**: clicar no produto abre Dialog que esconde o ranking

### Solução

#### 1. Estado vazio atrativo
- Ilustração grande com ícone de gráfico/foguete
- Título "Seus dados de vendas aparecerão aqui"
- Subtítulo explicativo
- Botão "Sincronizar agora" grande e em destaque (bg-primary, não outline)
- Se estiver sincronizando, mostrar skeleton dos KPIs

#### 2. KPIs mais ricos
- Valores grandes (text-2xl no desktop) com formatação monetária separando centavos
- Adicionar 4º KPI: **Un/dia** (unidades por dia média)
- No mobile: grid 2×2 em vez de 3 colunas apertadas
- Ícones maiores e cores mais vibrantes

#### 3. Expandir inline em vez de popup
- Remover `ProductDetailDrawer` (Dialog)
- Ao clicar no produto no ranking, expandir um painel **abaixo** dele com animação suave (Collapsible)
- O painel mostra: métricas (4 cards 2×2), barras de participação, variações e insight
- Clicar de novo ou em outro produto fecha/troca
- Barra de progresso visual no item do ranking mostrando % do total

#### 4. Ranking melhorado
- Cada item mostra uma mini barra horizontal de participação (% do total) atrás do texto
- Top 3 com destaque visual (medalha dourada, prata, bronze)
- Seta chevron indicando que é expansível

### Alterações

**`src/pages/Performance.tsx`**:
- Estado vazio redesenhado com CTA forte
- KPIs em grid 2×2 mobile / 4 colunas desktop, com 4º KPI (Un/dia)
- Ranking com expand inline (Collapsible) em vez de popup
- Mini barra de % atrás de cada item do ranking
- Top 3 com medalhas (🥇🥈🥉)
- Remover import do ProductDetailDrawer

**`src/components/performance/ProductDetailDrawer.tsx`**:
- Transformar em `ProductExpandedDetail` — componente inline (não Dialog)
- Mesmo conteúdo (métricas, variações, participação, insight) mas renderizado inline
- Animação de expand/collapse suave

### Resultado
Estado vazio convidativo, KPIs com mais impacto visual, detalhes de produto inline sem interromper o ranking, e medalhas nos top 3.

