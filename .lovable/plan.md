

## Plano: Verificar e Melhorar Responsividade Mobile

Após análise completa do código em todas as páginas, identifiquei os seguintes problemas e melhorias para mobile (390px viewport):

---

### Problemas Encontrados

**1. Home — Grid de ferramentas e layout**
- O grid `md:grid-cols-[3fr_2fr]` está correto para desktop, mas no mobile o `space-y-4` se perde porque o `md:space-y-0` é aplicado junto com `md:grid`. Isso funciona, mas a seção "Ferramentas" tem `md:col-span-full` que força ela abaixo das duas colunas — no mobile fica OK, mas "Seus Produtos" também tem `md:col-span-full` e aparece após ferramentas, quebrando a ordem visual mobile (ferramentas deveria vir depois de métricas no mobile).

**2. RoasAnalysis — KPI cards 3 colunas apertados em 390px**
- Os 3 cards de ROAS (Empate / Lucro Médio / Lucrativo) usam `grid-cols-3` sem responsividade. Em 390px com padding, cada card tem ~110px — os labels "Lucro Médio" e "Lucrativo" ficam apertados. Texto pode quebrar.

**3. RoasAnalysis — Diagnostic Banner + Insight Banner duplicados**
- Há dois banners de diagnóstico consecutivos (linhas 620-667): o "Diagnostic Banner" e o "Insight Banner" mostram essencialmente a mesma informação com textos muito similares, ocupando espaço duplo no mobile.

**4. RoasAnalysis — ProductSelector overflow**
- A lista de produtos com `max-h-[260px]` + cards de 4 colunas + gauge chart + barra ROAS torna o scroll muito longo no mobile. O layout `md:grid-cols-12` com col-span-4/8 funciona no desktop mas no mobile empilha tudo verticalmente.

**5. Stock — Stats cards em 4 colunas no mobile**
- `grid-cols-4` em 390px = ~85px por card. Os números `text-2xl` ficam aceitáveis, mas o label pode ficar apertado.

**6. AdsTab — Ranking items com muitos elementos na mesma linha**
- O badge `#N` (w-8) + nome + status icon + ROAS value + chevron na mesma linha pode causar overflow em 375px.

---

### Correções Propostas

**Arquivo: `src/components/charts/RoasAnalysis.tsx`**
1. Remover o "Insight Banner" duplicado (linhas 654-667) — o "Diagnostic Banner" já cobre a mesma funcionalidade com mensagens melhores
2. KPI cards: usar `grid-cols-1` em mobile com layout horizontal compacto (label + valor na mesma linha), `grid-cols-3` em desktop
3. Reduzir tamanho do gauge chart no mobile de 160px para 140px

**Arquivo: `src/components/roas/AdsTab.tsx`**
4. No ranking, truncar nomes para 24 chars no mobile (já está 40, muito longo para 375px)
5. Reduzir padding no ranking item de `p-3.5` para `p-2.5` no mobile
6. Métricas expandidas: usar `grid-cols-2` em mobile ao invés de `grid-cols-4`

**Arquivo: `src/pages/Home.tsx`**
7. Reordenar as seções no mobile: Calculadora → Métricas → Ferramentas → Produtos (atualmente ferramentas vem depois de produtos no DOM mas o grid reordena no desktop)

**Arquivo: `src/pages/Stock.tsx`**
8. Stats cards: usar `grid-cols-2` no mobile com `grid-cols-4` no desktop (de `grid-cols-4 md:flex`)

---

### Detalhes Técnicos

- KPI cards: `grid grid-cols-1 md:grid-cols-3 gap-2` com cada card usando `flex items-center justify-between` no mobile
- Ranking truncate: usar `useIsMobile()` hook ou simplesmente reduzir truncate para 24 e usar `sm:truncate` patterns
- Stats Stock: `grid-cols-2 md:grid-cols-4`
- AdsTab expanded metrics: `grid-cols-2 md:grid-cols-4`
- Remover Insight Banner duplicado completamente

Todas as alterações são CSS/layout only, sem mudanças em lógica ou funcionalidades.

