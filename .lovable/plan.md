

## Mostrar 2 produtos extras abaixo do selecionado no picker ROAS

### Problema
Com o produto pré-selecionado, o picker mostra apenas 1 card com botão "Trocar". No mobile o usuário não percebe que pode trocar.

### Mudança em `src/components/charts/RoasAnalysis.tsx` — `ProductPicker`

**No estado com produto selecionado (linhas ~187-270):**

Abaixo do card selecionado (e fora do dropdown), mostrar até **2 outros produtos** como mini-cards clicáveis semi-transparentes (`opacity-60 hover:opacity-100`), com estilo compacto:
- Imagem menor (`w-8 h-8`), nome truncado, preço
- Ao clicar, seleciona aquele produto diretamente
- Se houver ≤1 produto total, não mostrar nada extra
- Ordenar os outros produtos por `updatedAt` desc (mesma lógica do initial)
- Separar com um label discreto tipo `"Outros produtos"` em `text-[10px] text-text-3`

Isso fica **sempre visível** (não dentro do dropdown), logo abaixo do card principal.

### Arquivo modificado
- `src/components/charts/RoasAnalysis.tsx`

