

## Sistema de Design — Padronização de Tipografia e Espaçamentos

### Contexto da Auditoria

O app usa ~15 tamanhos arbitrários de fonte (`text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[15px]`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-4xl`) espalhados em 37+ arquivos sem padrão consistente. Espaçamentos de padding variam entre `p-3`, `p-3.5`, `p-4`, `p-5` em cards similares. Border-radius usa `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-[9px]`, `rounded-[10px]` de forma aleatória.

### Estratégia

Em vez de tocar em 37 arquivos de uma vez (risco alto de regressão), vamos:
1. Criar tokens no Tailwind config
2. Criar classes utilitárias no CSS
3. Aplicar nos componentes mais usados primeiro

---

### 1. Adicionar escala tipográfica no `tailwind.config.ts`

Adicionar em `theme.extend.fontSize`:

```text
display:  ['24px', { lineHeight: '1.2', fontWeight: '700' }]   → títulos de página
title:    ['18px', { lineHeight: '1.3', fontWeight: '600' }]   → títulos de seção
subtitle: ['15px', { lineHeight: '1.4', fontWeight: '600' }]   → subtítulos
body:     ['13px', { lineHeight: '1.5', fontWeight: '400' }]   → texto padrão
small:    ['11px', { lineHeight: '1.4', fontWeight: '400' }]   → labels, meta
micro:    ['10px', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '0.06em' }]  → uppercase labels
```

### 2. Adicionar tokens de espaçamento/radius no `tailwind.config.ts`

Atualizar `borderRadius`:
```text
card: '12px'
badge: '6px'
button: '10px'
input: '9px'
```

### 3. Adicionar classes utilitárias em `src/index.css`

Criar classes compostas reutilizáveis:
```css
.text-display  { @apply text-display text-foreground; }
.text-title    { @apply text-title text-foreground; }
.text-body     { @apply text-body text-foreground; }
.text-small    { @apply text-small text-muted-foreground; }
.text-micro    { @apply text-micro uppercase tracking-[0.08em] text-muted-foreground font-semibold; }
.text-secondary { @apply text-body text-muted-foreground; }   /* 60% opacity equiv */
.text-tertiary  { @apply text-small text-text-3; }             /* 35% equiv */
```

Atualizar `.section-label` para usar a escala micro:
```css
.section-label { @apply text-micro uppercase tracking-[0.08em] font-semibold; color: hsl(var(--text-3)); }
```

### 4. Aplicar nos componentes principais

**Arquivos a modificar (em ordem de impacto):**

| Arquivo | Mudanças |
|---------|----------|
| `ProductCard.tsx` | `text-sm` → `text-subtitle` no nome, `text-[10px]` → `text-micro` nos labels, `p-4` mantém, `rounded-2xl` → `rounded-card` |
| `ProductDetailDrawer.tsx` | `text-[9px]` → `text-micro`, `text-[10px]` → `text-micro`, `text-[13px]` → `text-body`, `rounded-[10px]` → `rounded-card`, `rounded-[9px]` → `rounded-input` |
| `AdsProductCard.tsx` | `text-[10px]` → `text-micro`, paddings uniformizados |
| `PageHeader.tsx` | `text-xl` → `text-display` no h1 |
| `Settings.tsx` | Section headers: `text-xs uppercase` → `text-micro`, labels `text-sm` → `text-body`, `text-[10px]` → `text-micro` |
| `Home.tsx` | `text-[15px]` → `text-subtitle`, `text-[11px]` → `text-small`, `text-[13px]` → `text-body`, `text-[9px]` → `text-micro` |
| `BottomNavigation.tsx` | `text-[10px]` → `text-micro` (sem uppercase aqui, manter override) |
| `Sidebar.tsx` | `text-[13px]`/`text-[14px]` → `text-body` |
| `Products.tsx` (página) | `text-xs` em labels → `text-micro`, uniformizar gap/padding |
| `ProductDetail.tsx` (desktop) | Mesmos tokens que drawer |

**Regra para cada componente:**
- Números/monetários: sempre `font-mono` (já existe `font-mono-num`)
- Labels uppercase: sempre `text-micro` 
- Card padding interno: `p-4` (16px)
- Gap entre cards: `gap-3` (12px)
- Gap entre seções: `gap-5` (20px)
- Padding lateral página: `px-4` mobile, `px-6` desktop
- Border-radius cards: `rounded-xl` (12px)
- Border-radius badges: `rounded-[6px]`
- Border-radius botões: `rounded-[10px]`
- Border-radius inputs: `rounded-[9px]`

### 5. Não alterar

- Cores (apenas tamanhos)
- Lógica/funcionalidades
- Componentes que já seguem o padrão
- Componentes de gráficos (Recharts)

### Estimativa: ~12 arquivos modificados

