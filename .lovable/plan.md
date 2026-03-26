
## Correção global do menu inferior cobrindo botões no mobile

### Diagnóstico
Fiz a auditoria do layout mobile e o problema não está só na aba Produtos.

Hoje existe uma inconsistência:
- o `AppLayout` já usa `pb-24` no mobile
- o `BottomNavigation` tem altura real composta por `height: 60px` + `padding-top` + `padding-bottom` + `safe-area`
- alguns drawers/modais ainda usam apenas `pb-[calc(1rem...)]` ou `pb-[calc(1.5rem...)]`
- alguns containers mobile usam `max-h-[90vh]` / `max-h-[92vh]`, o que deixa ações muito próximas da área do menu inferior

Isso explica por que, em telas como `/products`, o rodapé de ações ainda pode ficar “atrás” visualmente do menu.

### Componentes afetados já identificados
- `src/components/ProductDetailDrawer.tsx`
- `src/components/forms/ProductForm.tsx`
- `src/components/roas/QuickRegisterModal.tsx`
- `src/components/layout/BottomNavigation.tsx`
- `src/index.css`

Componentes que vou revisar no mesmo padrão para evitar novos casos:
- `src/components/stock/StockWizard.tsx`
- `src/components/stock/StockDetail.tsx`
- `src/components/roas/AdsDetailView.tsx`
- `src/components/roas/ProductAdsDetail.tsx`
- `src/components/roas/AdsLinkModal.tsx`
- `src/components/roas/ImportAdsModal.tsx`

### Implementação proposta

#### 1. Padronizar uma “folga segura” global para o menu inferior
Criar no CSS uma regra única para mobile, algo no padrão:

```text
--mobile-bottom-nav-clearance = 96px + safe-area
```

Aplicar isso em utilitários reutilizáveis, por exemplo:
- `mobile-nav-safe-pb`
- `mobile-sheet-safe-pb`
- `mobile-sheet-fullscreen`

Objetivo: parar de espalhar valores diferentes (`1rem`, `1.5rem`, `pb-24`, `96px`) pelo app.

#### 2. Corrigir o `ProductDetailDrawer`
Este é o caso principal reportado.

Ajuste:
- no mobile, o drawer passa a ocupar a tela toda ou quase toda com folga segura real
- o footer de ações recebe padding-bottom com a mesma clearance do menu
- garantir `flex-shrink-0` no rodapé e `overflow-y-auto` apenas no conteúdo

Resultado:
- botões “Editar”, “Compartilhar”, “Duplicar”, “Excluir” ficam sempre visíveis
- nada fica encostado na barra inferior

#### 3. Reforçar o `ProductForm`
Mesmo já estando melhor, vou alinhar com a mesma regra global:
- remover dependência de espaçamento local menor
- usar a clearance padronizada no footer
- revisar o `pb-20` do conteúdo interno para evitar dupla compensação ou falta de espaço

#### 4. Ajustar modais mobile com CTA no rodapé
Aplicar o mesmo padrão nos modais/drawers com botão principal no fim:
- `QuickRegisterModal`
- `StockWizard` / `StockDetail` se houver ação no rodapé visível
- detalhes de Ads, caso algum CTA final fique no limite inferior em viewport curta

#### 5. Revisão dos FABs e páginas com scroll
Como já existem FABs em `Products` e `Stock` com offset manual, vou validar se continuam coerentes com a nova clearance unificada, para não haver:
- botão flutuante alto demais
- botão ainda encostando no menu

### Arquivos que devem ser alterados
- `src/index.css`
- `src/components/layout/BottomNavigation.tsx`
- `src/components/ProductDetailDrawer.tsx`
- `src/components/forms/ProductForm.tsx`
- `src/components/roas/QuickRegisterModal.tsx`

Possíveis ajustes complementares após a revisão:
- `src/components/stock/StockWizard.tsx`
- `src/components/stock/StockDetail.tsx`
- `src/components/roas/AdsDetailView.tsx`
- `src/components/roas/ProductAdsDetail.tsx`
- `src/components/roas/AdsLinkModal.tsx`
- `src/components/roas/ImportAdsModal.tsx`

### Resultado esperado
- na aba Produtos, ao abrir um produto, os botões do rodapé ficam 100% visíveis
- formulários e modais mobile não ficam mais “sob” o menu inferior
- o comportamento vira consistente em todo o app, não só numa tela isolada

### Detalhe técnico
A correção mais robusta não é aumentar padding pontualmente em cada arquivo, e sim:
1. definir uma altura segura única para o menu inferior
2. reutilizar essa medida em drawers, modais e footers mobile
3. deixar o conteúdo scrollável separado do rodapé de ações

Assim evitamos novos bugs sempre que surgir outro modal com botão no final.
