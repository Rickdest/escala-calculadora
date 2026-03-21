

## Plano: Melhorar margens e espaçamentos no desktop

Apenas alterações para `md:` breakpoint. Mobile fica intocado.

### Mudanças

**1. `src/components/layout/AppLayout.tsx`**
- Aumentar max-width de `720px` → `800px` — mais respiro para listas e cards
- Adicionar `md:py-6` no container de conteúdo para espaçamento vertical superior após o header

**2. `src/components/layout/DesktopHeader.tsx`**
- Aumentar padding horizontal de `px-4` → `px-6` para alinhar melhor com o conteúdo
- Aumentar altura de `h-14` → `h-16` para dar mais presença ao header

**3. `src/components/layout/Sidebar.tsx`**
- Alinhar altura do logo com novo header: `h-14` → `h-16`

**4. Páginas — adicionar espaçamento vertical desktop**
Cada página que usa `py-*` pequeno ganha `md:py-8` para mais respiro:
- `Home.tsx` — `py-3` → `py-3 md:py-8`
- `Products.tsx` — `pt-2` → `pt-2 md:pt-6`
- `Stock.tsx` — `pt-2` → `pt-2 md:pt-6`
- `Roas.tsx` — `py-4` → `py-4 md:py-8`
- `Stores.tsx` — `py-6` → `py-6 md:py-8`
- `Settings.tsx`, `Profile.tsx`, `Education.tsx` — já têm `py-6`, aumentar para `md:py-8`

Zero alteração mobile, funcional ou de cores.

