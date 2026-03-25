

## Corrigir Bugs de Layout Mobile na Aba Ads

### Bugs Identificados

1. **Botões de ação no card não vinculado (AdsProductCard)**: O texto "⚠️ Vincule para ver lucratividade" + botão "Vincular" + botão "Cadastrar" estão numa única linha flex, transbordando em telas de 390px
2. **Grid de KPIs (AdsProductCard)**: As células do grid não têm `min-w-0` / `overflow-hidden`, fazendo valores monetários longos como "R$ 5.914,00" transbordarem da coluna
3. **SummaryCards KPIs**: Valores monetários longos em `text-base` podem ultrapassar o container em `grid-cols-2`

### Correções

**Arquivo: `src/components/roas/AdsProductCard.tsx`**

1. **Linha de ação dos não vinculados** (linhas 136-150): Mudar layout para empilhar em mobile — warning text em uma linha, botões em outra:
   - Trocar `flex items-center` por `flex flex-col gap-2`
   - Botões ficam numa sub-row `flex items-center gap-2`

2. **Grid de KPIs** (linha 91): Adicionar `overflow-hidden` em cada célula do grid e garantir `min-w-0` para truncamento funcionar corretamente

**Arquivo: `src/components/roas/SummaryCards.tsx`**

3. **KPI cards**: Garantir que valores monetários longos não quebrem o layout — adicionar `overflow-hidden` no container de valor

**Arquivo: `src/components/cards/ProductCard.tsx`**

4. **Metrics bar**: Sem bugs críticos — o `flex-wrap` já cuida do overflow. Apenas garantir que valores monetários longos no badge de lucro tenham `truncate`

### Arquivos Alterados
- `src/components/roas/AdsProductCard.tsx`
- `src/components/roas/SummaryCards.tsx`
- `src/components/cards/ProductCard.tsx` (ajuste menor)

