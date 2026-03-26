

## Corrigir botão de salvar obstruído pelo menu inferior no ProductForm

### Problema
Ao abrir o formulário de produto (clicando para editar), o botão "Salvar" no rodapé fica parcialmente coberto ou inacessível no mobile.

### Causa
O footer do `ProductForm` usa a classe `safe-bottom` (que dá apenas `max(1.5rem, env(safe-area-inset-bottom))`). Em dispositivos sem safe-area (como o preview), isso resulta em apenas 24px de padding — insuficiente quando o formulário não cobre completamente a bottom navigation.

### Correção

**Arquivo: `src/components/forms/ProductForm.tsx` (linha 717)**

Trocar `safe-bottom` por padding explícito maior que garanta espaço suficiente:

```
Antes:  <div className="p-4 border-t border-border safe-bottom bg-surface relative z-[60] flex-shrink-0">
Depois: <div className="p-4 border-t border-border pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-surface relative z-[60] flex-shrink-0">
```

**Arquivo: `src/components/ProductDetailDrawer.tsx` (ações no rodapé)**

Verificar e garantir o mesmo padrão no drawer de detalhes — já usa `pb-[calc(1rem+env(safe-area-inset-bottom))]`, manter.

**Arquivo: `src/components/layout/BottomNavigation.tsx`**

Esconder o bottom nav quando um modal z-[70] está aberto não é prático sem estado global. Alternativa: garantir que o `ProductForm` cubra 100% da tela adicionando `min-h-screen` ou trocando `max-h-[92vh]` para `h-full` no container interno quando em mobile.

### Solução mais robusta

Mudar o container interno do `ProductForm` (linha 203) para ocupar toda a tela no mobile:

```
Antes:  fixed inset-x-0 bottom-0 z-[70] ... max-h-[92vh]
Depois: fixed inset-0 z-[70] ... md:inset-x-0 md:bottom-0 md:top-auto md:max-h-[92vh] md:rounded-t-2xl
```

Isso faz o formulário cobrir a tela inteira no mobile (escondendo o bottom nav), e manter o comportamento de sheet no desktop.

### Arquivos modificados
- `src/components/forms/ProductForm.tsx`

