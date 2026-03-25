

## Corrigir Botões Escondidos por Bottom Nav em Modais

### Problema
O modal "Cadastro Rápido" (`QuickRegisterModal`) usa `z-50` — mesmo z-index da bottom nav — fazendo o botão "Cadastrar e Vincular" ficar escondido atrás da navegação inferior. Outros modais com `z-50` e posicionamento inferior também podem ter esse problema.

### Correções

**Arquivo: `src/components/roas/QuickRegisterModal.tsx`**
1. Aumentar z-index do overlay de `z-50` para `z-[70]` (consistente com ProductForm)
2. Adicionar `pb-[calc(1.5rem+env(safe-area-inset-bottom))]` no container do modal em mobile para garantir que o botão fique acima da safe area

**Arquivo: `src/components/roas/AdsLinkModal.tsx`**
3. Aumentar z-index de `z-50` para `z-[70]`

**Arquivo: `src/components/roas/ImportAdsModal.tsx`**
4. Aumentar z-index de `z-50` para `z-[70]`

**Arquivo: `src/components/roas/ProductAdsDetail.tsx`**
5. Aumentar z-index de `z-50` para `z-[70]`

**Arquivo: `src/components/roas/AdsDetailView.tsx`**
6. Aumentar z-index de `z-50` para `z-[70]`

**Arquivo: `src/components/stock/StockDetail.tsx`**
7. Aumentar z-index de `z-50` para `z-[70]` (overlay e movement modal)

**Arquivo: `src/components/stock/StockWizard.tsx`**
8. Aumentar z-index de `z-50` para `z-[70]`

### Resultado
- Todos os modais ficam acima da bottom nav (z-50)
- Botões de ação sempre visíveis e clicáveis
- Safe area respeitada no QuickRegisterModal

