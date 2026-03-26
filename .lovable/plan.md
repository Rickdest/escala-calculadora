

## Corrigir ProductDetailDrawer travado (não fecha)

### Problema
Na linha 83, o drawer interno tem classes conflitantes: `fixed inset-0` junto com `relative`. Isso faz o drawer cobrir toda a tela (incluindo o backdrop), impedindo o clique no backdrop de funcionar para fechar. O resultado é um popup que fica "travado".

### Causa raiz
Na última correção de padding, o container interno recebeu `fixed inset-0` para cobrir o bottom nav no mobile. Porém, o wrapper externo (linha 77) já é `fixed inset-0` e serve como área clicável para fechar. Ao colocar `fixed inset-0` também no filho, o `onClick={onClose}` no wrapper nunca é atingido — o `stopPropagation` do filho intercepta tudo.

### Correção

**Arquivo: `src/components/ProductDetailDrawer.tsx` (linha 83)**

Trocar o container interno de `fixed inset-0` para layout relativo que ocupa a tela no mobile sem conflitar com o backdrop:

```
Antes:
className="relative w-full bg-card border border-border flex flex-col animate-slide-up overflow-hidden fixed inset-0 md:relative md:inset-auto md:max-w-lg md:max-h-[90vh] md:rounded-2xl rounded-t-none"

Depois:
className="relative w-full max-h-full bg-card border border-border flex flex-col animate-slide-up overflow-hidden md:max-w-lg md:max-h-[90vh] md:rounded-2xl rounded-t-none"
```

Mudança principal:
- Remove `fixed inset-0` do div interno — o wrapper externo já garante posicionamento full-screen
- Adiciona `max-h-full` para que o drawer ocupe a altura disponível dentro do flex container
- O wrapper externo (`fixed inset-0 flex items-end`) já posiciona o drawer na base no mobile
- O backdrop continua clicável para fechar
- O botão X continua funcionando normalmente

### Arquivo modificado
- `src/components/ProductDetailDrawer.tsx`

