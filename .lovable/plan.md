

## Melhorar distribuição dos atalhos "Outras plataformas"

### Problema
5 itens em `grid-cols-4` — os 4 primeiros ficam na primeira linha e o Mercado Livre fica sozinho na segunda linha, desalinhado.

### Solução
Mudar de `grid-cols-4` para `grid-cols-5` no mobile, distribuindo todos os 5 marketplaces em uma única linha. Reduzir levemente o tamanho dos ícones e texto para caber bem em telas pequenas (390px).

Também aplicar a mesma lógica no desktop (seção "Outras plataformas" dentro do layout desktop usa `grid-cols-4` → mudar para `grid-cols-5`).

### Detalhes
- Mobile: `grid grid-cols-5 gap-2` — todos em 1 linha
- Desktop: `grid grid-cols-5 gap-3` — todos em 1 linha
- Ícone: manter `w-9 h-9` (cabe bem em 5 colunas a 390px)
- Texto nome: `text-[10px]` → manter
- Remover `px-1` do botão para ganhar espaço

### Arquivo
- `src/pages/Home.tsx` — 2 alterações (mobile linha 192, desktop ~linha 280)

