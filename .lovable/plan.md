

## Plano: Corrigir Scroll e Melhorar Responsividade Desktop/Mobile

---

### Problemas Identificados

**Scroll bloqueado:**
1. `overscroll-behavior: none` em html E body impede scroll natural em containers internos quando o conteúdo toca as bordas
2. `overflow-x: hidden` em html e body pode capturar scroll events em containers com scroll interno (ex: lista de produtos no RoasAnalysis com `max-h-[260px]`, lista de ads com `max-h-[280px]`)
3. A página Roas tem `pb-20 md:pb-4` no wrapper mas o conteúdo interno não tem overflow adequado — a combinação de `min-h-screen` no root + `overflow-x: hidden` no body cria situações onde o scroll vertical é bloqueado em containers intermediários

**Layout desktop pobre:**
4. Páginas Profile e Settings não têm max-width no mobile, campos ficam largos demais no desktop
5. Stock page stats cards se esticam demais em telas grandes
6. Home desktop grid pode ficar desproporcional em monitores ultrawide

---

### Correções

**Arquivo: `src/index.css`**
- Mover `overflow-x: hidden` apenas para `body`, remover de `html` — o html com overflow hidden captura eventos de scroll e bloqueia containers internos
- Remover `overscroll-behavior: none` do `html` — manter apenas no body para prevenir pull-to-refresh sem bloquear scroll de containers
- Adicionar smooth scrolling: `scroll-behavior: smooth` no html

**Arquivo: `src/components/layout/AppLayout.tsx`**
- Adicionar `overflow-y-auto` no container principal de conteúdo para garantir scroll independente
- No desktop, fazer o main content area ter `min-h-screen` com scroll próprio para evitar dependência do body scroll
- Adicionar padding lateral responsivo: `px-4 md:px-8 lg:px-12`

**Arquivo: `src/components/charts/RoasAnalysis.tsx`**
- ProductSelector: adicionar `overscroll-behavior: contain` na lista scrollável para evitar que scroll interno propague para o body
- Seção de ads importados (`max-h-[280px]`): mesmo fix
- Tab content: garantir que não há `overflow: hidden` implícito bloqueando scroll

**Arquivo: `src/components/roas/AdsTab.tsx`**
- Ranking e Alerts com `divide-y` dentro de container fixo: adicionar `overflow-y-auto` com `max-h` adequado para telas pequenas
- Desktop layout `md:grid-cols-[2fr_3fr]`: adicionar `overflow-y-auto` por coluna para scroll independente no desktop

**Arquivo: `src/pages/Home.tsx`**
- Desktop grid: adicionar `lg:max-w-[1400px]` e melhor proporção para ultra-wide

**Arquivo: `src/pages/Stock.tsx`**
- Container principal: adicionar `overflow-y-auto` para garantir scroll

**Arquivo: `src/pages/Profile.tsx`**
- Wrapper do form: `md:max-w-[600px]`

**Arquivo: `src/pages/Settings.tsx`**
- Wrapper do form: `md:max-w-[600px]`

---

### Detalhes Técnicos

**Fix principal de scroll** — o problema central é que `html { overflow-x: hidden }` com `overscroll-behavior: none` cria um "scroll trap". Quando um container interno (como a lista de produtos no ROAS) atinge seu limite de scroll, o evento deveria propagar para o body, mas é bloqueado. A solução:

```css
html {
  /* REMOVER: overflow-x: hidden e overscroll-behavior: none */
  scroll-behavior: smooth;
}

body {
  overflow-x: hidden; /* manter apenas aqui */
  overscroll-behavior-x: none; /* apenas eixo X */
}
```

**Scroll em containers internos:**
```css
.scroll-container {
  overscroll-behavior: contain; /* isola scroll sem bloquear */
}
```

Nenhuma funcionalidade ou lógica será alterada. Apenas CSS e classes de layout.

