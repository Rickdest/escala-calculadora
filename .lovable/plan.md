

## Fix: Botão "Salvar" escondido atrás da navegação inferior

### Problema
O footer do drawer (`absolute bottom-0`) fica por baixo da barra de navegação inferior (`fixed bottom-0 z-50`). No mobile, o botão "Salvar alterações" fica inacessível.

### Correção

**Arquivo: `src/components/ProductDetailDrawer.tsx` (linha 485)**

Adicionar padding-bottom extra no footer para compensar a altura da bottom nav (~70px + safe area):

```
// ANTES
<div className="absolute bottom-0 left-0 right-0 p-3 pb-5 bg-gradient-to-t ...">

// DEPOIS  
<div className="absolute bottom-0 left-0 right-0 p-3 pb-[calc(1.25rem+70px+env(safe-area-inset-bottom))] bg-gradient-to-t ...">
```

Também aumentar o padding-bottom da área de scroll para que o conteúdo não fique atrás do footer expandido:

Localizar o container scrollável e ajustar seu `pb-` de modo que o último conteúdo não fique coberto pelo footer maior.

### Resultado
O botão "Salvar alterações" ficará visível acima da barra de navegação inferior em todas as telas mobile.

