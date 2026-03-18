

## Plano: Melhorar Layout da Aba ROAS

### Problemas atuais

O arquivo `RoasAnalysis.tsx` tem 1078 linhas com tudo num único arquivo monolítico. O layout usa `glass-card` genérico em todo lugar, as tabs são pequenas, e a hierarquia visual é fraca. Os KPI cards, gauge, e seções se misturam sem respiração adequada.

### Alterações

**Arquivo: `src/pages/Roas.tsx`**
- Header mais limpo com subtítulo refinado

**Arquivo: `src/components/charts/RoasAnalysis.tsx`**

Manter toda a lógica e cálculos intactos. Apenas melhorar o layout visual:

1. **Tabs redesenhadas**: Fundo mais definido, tabs maiores com ícones mais visíveis, active state com accent laranja sutil (não genérico cinza)

2. **Aba Produto — Hierarquia visual**:
   - Seletor de produto: card mais compacto com borda `border-border/30`, fundo `bg-card/40`
   - Card de Ads inputs: layout mais limpo, inputs lado a lado com labels refinados
   - Product Health Banner: manter, já está bom
   - Gauge + Cost Breakdown: lado a lado em desktop, empilhados em mobile, com bordas mais sutis
   - KPI Cards: grid 3 colunas mais compacto, remover `highlight` com scale/ring exagerado, usar borda accent sutil no card destacado
   - Barra de progresso ROAS: mais fina (h-3 em vez de h-4), marcadores mais discretos
   - Detalhamento financeiro: tabela mais densa, sem ícones redundantes nas linhas
   - Seções com separadores visuais sutis em vez de `glass-card` empilhados

3. **Aba Simulador**:
   - Sliders mais compactos
   - KPI cards em linha única
   - Gráfico de cenários: manter, ajustar bordas

4. **Aba Ranking**:
   - Cards de ranking mais densos/tabulares (estilo Shopee)
   - Gráfico comparativo: bordas refinadas

5. **Estilo geral aplicado**:
   - Trocar `glass-card` por `rounded-xl border border-border/30 bg-card/40`
   - Espaçamento `space-y-4` em vez de `space-y-5`
   - Cards sem sombras exageradas
   - Fontes e labels consistentes com o padrão da Home

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `src/components/charts/RoasAnalysis.tsx` | Layout visual das 3 abas, cards, tabs, espaçamento |
| `src/pages/Roas.tsx` | Ajuste mínimo no padding |

### Regras

- NÃO alterar cálculos, taxas ou lógica de ROAS
- NÃO alterar outros arquivos
- NÃO refatorar para múltiplos arquivos (manter estrutura atual)
- Manter mobile first (375px)

