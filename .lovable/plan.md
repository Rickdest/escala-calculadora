

## Auditoria Completa e Correções — Mobile, UX, Bugs, Performance e Segurança

### Diagnóstico

Após análise profunda de todos os componentes, identifiquei **3 categorias prioritárias** de problemas:

---

### PRIORIDADE 1: Bugs de Layout Mobile (Responsividade)

**Bug 1 — `AdsDetailView.tsx` (linha 140): Inner container com `fixed inset-0` impede fechamento**
Mesmo bug que o `ProductDetailDrawer` tinha. O container interno usa `fixed inset-0` junto com o wrapper externo, cobrindo o backdrop e impedindo o clique para fechar.

Correção: Remover `fixed inset-0` do div interno, usar posicionamento relativo dentro do wrapper.

**Bug 2 — `ProductAdsDetail.tsx` (linha 119): Mesmo padrão quebrado**
Container interno com `fixed inset-0` sobre o wrapper que tem `onClick={onClose}`.

Correção: Mesmo padrão — remover `fixed inset-0` do div interno.

**Bug 3 — `ProductDetailDrawer.tsx` (linha 83): Drawer não ocupa tela toda no mobile**
O drawer usa `max-h-full` mas o wrapper usa `flex items-end`, fazendo o drawer começar de baixo. Em telas curtas, o conteúdo pode ficar apertado e os botões de ação cortados.

Correção: No mobile, fazer o drawer ocupar a tela toda (`h-full`) para garantir que os botões de ação fiquem sempre visíveis.

**Bug 4 — Console warning: `DropdownMenu` recebendo ref indevidamente no `ProductCard`**
O log mostra: "Function components cannot be given refs" no `ProductCard`. Isso não quebra nada mas polui o console.

Correção: Verificar se há ref sendo passada ao `DropdownMenu` no `ProductCard` e remover.

---

### PRIORIDADE 2: Padronização de Modais/Drawers

**Componentes que precisam de revisão de footer padding:**

| Componente | Problema |
|---|---|
| `AdsDetailView` | `fixed inset-0` no inner + sem `mobile-sheet-footer` |
| `ProductAdsDetail` | `fixed inset-0` no inner + sem footer padding |
| `ImportAdsModal` | `max-h-[80vh]` pode cortar conteúdo no mobile |
| `AdsLinkModal` | `max-h-[70vh]` pode ficar apertado |
| `StockWizard` | OK — já usa `fixed inset-0` corretamente (wrapper = inner) |
| `StockDetail` | OK — mesmo padrão do StockWizard |

---

### PRIORIDADE 3: Melhorias de UX, Performance e Segurança

**UX:**
- Botões de ação nos drawers/modais devem ter `touch-action: manipulation` para evitar delay de 300ms no mobile
- `AdsLinkModal` e `ImportAdsModal` devem ser full-screen no mobile (consistência)

**Performance:**
- Já usa `React.memo` no ProductCard e lazy loading — OK
- `AdsDetailView` tem ~15 `useMemo` — está correto, sem over-computation

**Segurança:**
- `ImportAdsModal` já usa `validateCSVSecurity` — OK
- `handleShare` usa `navigator.clipboard` com fallback `document.execCommand` — OK
- Inputs numéricos validados com `parseFloat` — OK
- RLS policies cobrem os dados — OK

---

### Plano de Implementação

#### Arquivo 1: `src/components/roas/AdsDetailView.tsx`
- **Linha 140**: Remover `fixed inset-0` do container interno
- Resultado: `className="bg-card border border-border w-full h-full md:h-auto flex flex-col animate-scale-up overflow-hidden md:relative md:max-w-lg md:max-h-[92vh] md:rounded-2xl"`

#### Arquivo 2: `src/components/roas/ProductAdsDetail.tsx`
- **Linha 119**: Remover `fixed inset-0` do container interno
- Ajustar wrapper (linha 117) para `flex items-end md:items-center` no mobile
- Resultado: drawer full-height no mobile, modal centralizado no desktop

#### Arquivo 3: `src/components/ProductDetailDrawer.tsx`
- **Linha 77**: Trocar `flex items-end` por `flex flex-col` no mobile para drawer ocupar tela toda
- **Linha 83**: Adicionar `h-full md:h-auto` para garantir que o drawer preencha no mobile

#### Arquivo 4: `src/components/roas/AdsLinkModal.tsx`
- Full-screen no mobile: trocar `max-h-[70vh] rounded-2xl` por `fixed inset-0 md:relative md:inset-auto md:max-h-[70vh] md:rounded-2xl`

#### Arquivo 5: `src/components/roas/ImportAdsModal.tsx`
- Full-screen no mobile: trocar `max-h-[80vh] rounded-2xl` por `h-full md:h-auto md:max-h-[80vh] md:rounded-2xl`

#### Arquivo 6: `src/components/cards/ProductCard.tsx`
- Investigar e corrigir o warning de ref no `DropdownMenu`

### Arquivos modificados
- `src/components/roas/AdsDetailView.tsx`
- `src/components/roas/ProductAdsDetail.tsx`
- `src/components/ProductDetailDrawer.tsx`
- `src/components/roas/AdsLinkModal.tsx`
- `src/components/roas/ImportAdsModal.tsx`
- `src/components/cards/ProductCard.tsx`

