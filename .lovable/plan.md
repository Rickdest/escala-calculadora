

## Compactar filtros e status no mobile — aba Análise de Ads

### Mudanças (apenas mobile, desktop inalterado)

**1. `src/components/roas/SummaryCards.tsx` — Status mini cards compactos no mobile**
- Trocar o grid 2x2 de cards altos por uma **row horizontal única** (`flex overflow-x-auto md:grid md:grid-cols-4`) no mobile
- Reduzir padding de `p-3` para `p-2` e texto de `text-xl` para `text-base` no mobile
- Resultado: 4 items numa linha scrollável em vez de 2x2

**2. `src/components/roas/FilterChips.tsx` — Chips menores no mobile**
- Reduzir padding de `px-3 py-1.5` para `px-2.5 py-1`
- Reduzir fonte de `text-xs` para `text-[10px]`
- Reduzir gap de `gap-2` para `gap-1.5`

**3. `src/components/roas/SummaryCards.tsx` — KPI cards compactos no mobile**
- Reduzir padding de `p-3` para `p-2.5` no mobile
- Reduzir valor de `text-lg` para `text-base` no mobile

### Arquivos modificados
- `src/components/roas/SummaryCards.tsx`
- `src/components/roas/FilterChips.tsx`

