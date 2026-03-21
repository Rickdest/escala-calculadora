

## Plano: Melhorar layout das abas Ads no desktop

Manter as 2 abas (ROAS e Shopee Ads) mas redesenhar o conteúdo interno para desktop com grid mais limpo e melhor hierarquia.

---

### Aba 1 — ROAS (ProductAnalysis + RoasRanking)

**Arquivo: `src/components/charts/RoasAnalysis.tsx`**

**ProductAnalysis — desktop grid:**
- Sidebar de produtos (`md:col-span-4`): manter como está, já funciona bem
- Área principal (`md:col-span-8`): reorganizar KPIs
  - Os 3 cards ROAS Empate/Saudável/Ideal: mudar de `md:grid-cols-3` para uma row horizontal com valores maiores (`text-2xl`) e labels menores
  - Barra de progresso ROAS: dar mais altura (`h-4` em vez de `h-3`) e adicionar `md:p-5` no card
  - Composição do Preço (donut): aumentar donut para `width={140} height={140}` no desktop
  - Cards Lucro Bruto e Taxa Shopee: manter grid 2 colunas

**RoasRanking — desktop grid:**
- Gráfico de barras (`md:col-span-5`): aumentar altura do chart de `220` para `280` no desktop
- Lista de produtos: usar `md:grid-cols-2` para mostrar 2 cards por linha em vez de lista vertical

**Substituir tokens antigos:**
- `text-muted-foreground` → `text-text-2` (restantes no arquivo)
- `bg-secondary` → `bg-surface-2`

---

### Aba 2 — Shopee Ads (AdsTab)

**Arquivo: `src/components/roas/AdsTab.tsx`**

**Layout desktop atual:** `md:grid-cols-[2fr_3fr]` — Resumo+Alertas à esquerda, Ranking+Margem à direita.

**Melhorias:**

1. **Resumo — cards KPI maiores no desktop:**
   - Adicionar `md:p-3.5` nos MetricCards
   - Valores: `text-lg` → `md:text-xl` para destaque
   - Grid `cols-3` (ROAS/ACOS/ROI): manter, mas com mais padding

2. **Ranking — expandir no desktop:**
   - Items: aumentar padding `md:p-4` 
   - Nome do produto: `md:max-w-none` para não truncar tanto
   - RoasBar: dar mais altura no desktop `md:h-2`
   - Grid de métricas expandidas: `md:grid-cols-4` (já está, manter)

3. **Alertas — mais compactos:**
   - Manter accordion mas com `md:h-14` por item para mais respiro
   - Texto de recomendação: `md:text-xs` em vez de `text-[11px]`

4. **Margem vs Ads — grid no desktop:**
   - Quando há 2+ matches: `md:grid md:grid-cols-2 md:gap-3` para mostrar lado a lado
   - Cards individuais: `md:p-4` para mais respiro

5. **Header (período + botão Atualizar):**
   - Aumentar fonte do período: `md:text-sm`
   - Botão Atualizar: `md:h-9 md:text-xs` mais visível

---

### Tab bar

**Manter a pill-style tab bar** mas ajustar no desktop:
- `md:w-auto md:inline-flex` em vez de `w-full grid` — tabs não precisam ocupar 100% no desktop
- `md:h-12` para mais presença
- `md:text-sm` nos triggers

---

### Resumo das mudanças

- 2 arquivos: `RoasAnalysis.tsx` e `AdsTab.tsx`
- Apenas classes CSS com `md:` prefix
- Zero alteração funcional ou mobile
- Foco em: padding, tamanhos de fonte, grids, e respiro visual no desktop

