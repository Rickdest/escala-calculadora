

## Corrigir Tema Claro nos Componentes de Ads e ROAS

### Problema
Os arquivos `RoasAnalysis.tsx` e `AdsDetailFullView.tsx` usam centenas de cores hardcoded do tema dark (`bg-[#0a0a0a]`, `bg-[#121212]`, `text-white`, `text-slate-400/500/600/700/800`, `bg-slate-800`, `bg-emerald-900/20`, etc.) que ficam ilegíveis ou visualmente quebrados no tema claro.

### Estratégia
Substituir todas as cores hardcoded por tokens semânticos do design system (CSS variables via Tailwind), que já possuem variantes light/dark definidas em `index.css`. Para cores semânticas (emerald, orange, red, amber, blue) que não têm token equivalente, usar a sintaxe `dark:` do Tailwind para dupla definição.

### Mapa de substituições (ambos arquivos)

| Hardcoded | Token Light/Dark |
|---|---|
| `bg-[#0a0a0a]` | `bg-background` |
| `bg-[#121212]` | `bg-card` |
| `bg-[#1a1a1a]` | `bg-card` |
| `border-slate-800` | `border-border` |
| `border-slate-700` | `border-border` |
| `text-white` | `text-foreground` |
| `text-slate-300` | `text-foreground/80` ou `text-text-2` |
| `text-slate-400` | `text-text-2` |
| `text-slate-500` | `text-text-3` |
| `text-slate-600` | `text-text-3` |
| `bg-slate-800/50` | `bg-surface-2` |
| `bg-slate-800` | `bg-surface-2` |
| `hover:bg-slate-800` | `hover:bg-surface-2` |
| `divide-slate-800/50` | `divide-border` |
| `text-emerald-400` | `text-success` |
| `text-emerald-300` | `text-success` |
| `bg-emerald-900/20` | `bg-success/10 dark:bg-success/20` |
| `bg-emerald-500` | `bg-success` |
| `border-emerald-500/50` | `border-success/50` |
| `border-emerald-500/30` | `border-success/30` |
| `border-emerald-500/20` | `border-success/20` |
| `text-orange-400` | `text-warning` |
| `bg-orange-900/20` | `bg-warning/10 dark:bg-warning/20` |
| `border-orange-500/20` | `border-warning/20` |
| `text-red-400` | `text-destructive` |
| `bg-red-900/20` | `bg-destructive/10 dark:bg-destructive/20` |
| `border-red-500/20` | `border-destructive/20` |
| `text-amber-400` | `text-warning` |
| `bg-amber-900/10` | `bg-warning/10` |
| `border-amber-500/30` | `border-warning/30` |
| `text-blue-400` | `text-primary dark:text-blue-400` (ou manter blue para info) |

### Arquivos modificados

1. **`src/components/charts/RoasAnalysis.tsx`** (~641 linhas)
   - `statusColors` object: trocar valores para tokens
   - `TipIcon`: tooltip bg/border/text
   - `CostBreakdownCard`: card bg, borders, text colors, donut tooltip contentStyle
   - `ProductDropdown`: button, dropdown, search, items
   - `ProductAnalysis`: inputs, result card, gauge bar, alerts, empty states
   - `RoasRanking`: cards, badges, text
   - `RoasAnalysis` (export): wrapper bg, tabs

2. **`src/components/roas/AdsDetailFullView.tsx`** (~1048 linhas)
   - `OperationLogTimeline`: card bg, borders, text, chart tooltip contentStyle, axis tick fills
   - `KpiCard`: bg, borders, text colors
   - Main component: page bg, header card, KPIs, unlinked warning, tabs, all diagnostic cards, all metric cards
   - Recharts inline styles (tooltip contentStyle, axis tick fills): usar CSS vars com fallback

3. **`src/components/roas/adsHelpers.ts`** — trocar `text-destructive` e tokens já usados (menor impacto)

### Notas de implementação
- Gradientes inline (gauge bar, ROAS status bar) precisam de abordagem `dark:` ou classes condicionais
- Recharts `contentStyle` e `tick.fill` são inline — usar variáveis CSS com `getComputedStyle` ou hardcoded com `dark:` wrapper
- Para o Recharts, manter as cores hex para strokes/fills dos gráficos (emerald `#10b981`, blue `#3b82f6`) pois são decorativas e funcionam em ambos temas
- O efeito glow (`bg-emerald-500/5 blur-3xl`) → `bg-success/5` funciona em ambos temas

### O que NÃO muda
- Nenhuma lógica, cálculo, estado ou hook
- Estrutura de layout (grids, flex, spacing)
- Funcionalidade de importação, navegação, tabs

