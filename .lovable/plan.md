

## Fix — Botão "Salvar" sumido no formulário de produto

### Diagnóstico
O formulário usa `flex flex-col` com `overflow-hidden` e `max-h-[92vh]`. O footer com o botão de salvar está fora do `<form>` scrollável, mas **não tem `flex-shrink-0`**, o que pode fazer o flexbox comprimir o footer quando o conteúdo é muito alto. Além disso, o `pb-6` no form pode não dar espaço suficiente para o último item ser visível acima do footer.

### Correções em `src/components/forms/ProductForm.tsx`

1. **Footer**: Adicionar `flex-shrink-0` ao div do footer (linha 557) para garantir que nunca seja comprimido
2. **Form padding**: Aumentar `pb-6` para `pb-20` no form scrollável para garantir que o último conteúdo não fique atrás do footer
3. **z-index do footer**: Já está com `z-[60]`, manter

### Verificação de outros botões

Também verificar:
- **FAB "Novo Produto"** na página Products (linha 356-365): posição `bottom-[calc(96px+env(safe-area-inset-bottom))]` — pode ser ocultado pela bottom nav em algumas telas. Verificar se está visível.
- **Botão "Calcular"** no QuickCalculator: parece OK, não está em modal.

### Mudança principal
```tsx
// Footer - adicionar flex-shrink-0
<div className="p-4 border-t border-border safe-bottom bg-surface relative z-[60] flex-shrink-0">
```

Arquivo: `src/components/forms/ProductForm.tsx` — 1 linha alterada.

