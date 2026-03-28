

## Ajustar layout da aba Produtos para match com o design de referência

### Mudanças principais

**1. Grid 3 colunas no desktop** (`Products.tsx`)
- Alterar `grid-cols-1 md:grid-cols-2` para `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

**2. Métricas inline no ProductCard** (`ProductCard.tsx`)
- Substituir os 3 cards com borda (margem, lucro, ROAS empate) por métricas inline sem borda — texto colorido grande com label abaixo, lado a lado em 3 colunas, sem background/border nos blocos individuais

**3. Rodapé do card: estoque + "Ver detalhes →"** (`ProductCard.tsx`)
- Adicionar linha inferior com ícone de pacote + quantidade em estoque à esquerda
- Botão "Ver detalhes →" alinhado à direita com estilo outline/primary
- Remover o hint atual de "↗ Ver detalhes · ACOS, GMV, Gasto"

**4. Estado "Produto sem dados"** (`ProductCard.tsx`)
- Quando `salePrice <= 0` ou `costPrice <= 0`, exibir card simplificado:
  - Nome como "Produto sem dados" em cor muted
  - Subtítulo "Sem preço cadastrado"
  - Alerta amarelo "⚠ Complete o cadastro para ver os cálculos"
  - Botão "Completar →"

**5. Botão "Importar relatório de Ads"** (`ProductCard.tsx`)
- Manter como está mas com texto centralizado e borda tracejada como na referência

### Arquivos modificados
- `src/pages/Products.tsx` — grid 3 colunas
- `src/components/cards/ProductCard.tsx` — métricas inline, rodapé com estoque/detalhes, estado sem dados

