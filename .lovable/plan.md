

## Plano: Padronizar Layout Mobile/Desktop

### Problema
Cada página tem padding próprio e max-width diferente — `px-2`, `px-3`, `px-4`, `md:max-w-[600px]`, `md:max-w-[800px]`, etc. Inconsistente.

### Solução: Centralizar no AppLayout

**Arquivo: `src/components/layout/AppLayout.tsx`**

Substituir a `<main>` atual:
```
max-w-lg mx-auto md:max-w-[1200px] px-4 md:px-8 lg:px-12
```
Por:
```
px-4 md:max-w-[720px] md:mx-auto md:px-10
```
- Mobile: `px-4` (16px) fixo em todas as telas
- Desktop: `max-w-[720px]` centralizado com `px-10` (40px)

**Arquivo: `src/components/layout/PageHeader.tsx`**

Remover `max-w-lg mx-auto md:max-w-none` do container interno — herda padding do AppLayout.

**Páginas — remover padding lateral duplicado:**

| Página | Remover | Manter |
|--------|---------|--------|
| Home.tsx | `px-2 md:px-0` | `py-3 md:py-6`, grid desktop |
| Products.tsx | `px-3 md:px-0 md:max-w-[800px]` | `pt-2 pb-24 md:pb-6` |
| Stock.tsx | `px-3 md:px-0 md:max-w-[800px]` | `pt-2 pb-24 md:pb-6` |
| Roas.tsx | `px-4 md:px-0` | `py-4 md:py-6` |
| Settings.tsx | `px-4 md:max-w-[600px] md:px-0` | `py-6` |
| Profile.tsx | `px-4 md:max-w-[600px] md:px-0` | `py-6` |
| Education.tsx | `px-4` | `py-6` |
| Stores.tsx | `px-4` | `py-6` |
| Paywall.tsx | `px-4 max-w-sm mx-auto` | `py-8` (keep max-w-sm for this narrow page) |

Cada página perde seu `px-*` e `md:max-w-*` / `md:px-*` porque o AppLayout já cuida disso.

### Detalhes Técnicos

- 9 arquivos editados (1 layout + 1 header + 7-8 páginas)
- Zero alteração funcional — apenas classes CSS
- Breakpoint único: `md:` (768px)

