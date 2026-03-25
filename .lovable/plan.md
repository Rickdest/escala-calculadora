

## Compactar Header e Destacar KPIs na Tela de Detalhe do Ads

### Problema
O card do produto (header) ocupa muito espaço vertical com nome longo quebrando múltiplas linhas, e os KPIs ficam dentro de cards bordados que parecem "presos" — sem destaque visual.

### Mudanças

**Arquivo: `src/components/roas/AdsDetailFullView.tsx`**

#### 1. Header do produto mais compacto
- Reduzir imagem de `w-16 h-16` para `w-12 h-12`
- Nome do produto: `text-base` com `line-clamp-2` (máx 2 linhas) em vez de `text-lg` sem limite
- Período + status + botão "Atualizar CSV" na mesma linha horizontal
- Padding reduzido de `p-5` para `p-3.5`

#### 2. KPIs com mais destaque visual
- Remover `border` e `bg-card` dos KpiCards individuais
- Usar fundo sólido colorido sutil: `bg-surface-2` com valores maiores (`text-2xl` → `text-3xl` no mobile)
- Reduzir padding dos KPI cards de `p-4` para `p-3`
- Labels menores: `text-[10px]` em vez de `text-xs`
- Sub-labels (como "Bom", "Emp: X") com cor semântica em vez de muted

#### 3. Layout mobile do grid de KPIs
- Manter `grid-cols-3` no mobile mas com `gap-2` em vez de `gap-3`
- Valores monetários com `truncate` para não quebrar

### Resultado esperado
- Header ~30% mais curto verticalmente
- KPIs visualmente mais proeminentes com valores grandes e fundo contrastante
- Mais espaço para o conteúdo analítico abaixo

### Arquivo alterado
- `src/components/roas/AdsDetailFullView.tsx`

