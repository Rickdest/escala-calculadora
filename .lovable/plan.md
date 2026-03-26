

## Corrigir conteúdo escondido atrás do menu inferior (bottom navigation)

O menu inferior tem ~80px de altura total (`60px` + paddings com `box-sizing: content-box`). O `AppLayout` tem `pb-20` (80px) que deveria cobrir, mas com `safe-area-inset-bottom` em iPhones pode não ser suficiente. Além disso, algumas páginas não têm padding extra para mobile.

### Mudanças

**1. `src/components/layout/AppLayout.tsx` (linha 44)**
- Aumentar padding bottom de `pb-20` para `pb-24` (96px) no mobile, mantendo `md:pb-0`

**2. `src/pages/Home.tsx` (linha 166)**
- Mobile wrapper: trocar `py-3` por `pt-3 pb-6` (o AppLayout já cuida do espaço do nav)

**3. `src/pages/Settings.tsx` (linha 126)**
- Trocar `py-6 md:py-8` por `pt-6 pb-8 md:py-8` para dar mais folga no final

**4. `src/components/charts/RoasAnalysis.tsx` (linha 569)**
- Trocar `pb-20 md:pb-4` por `pb-6 md:pb-4` (o AppLayout já cuida do padding do nav, evitar duplicação)

### Resultado
Todas as páginas terão espaço suficiente entre o último conteúdo e o menu inferior, sem sobreposição.

