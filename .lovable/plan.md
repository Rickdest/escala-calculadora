

## Ajustar layout dos cards de Ads: 3 colunas desktop + métricas horizontais

### Mudanças

**1. `src/components/roas/AdsTab.tsx` (linha 263)**
- Trocar `grid-cols-1 md:grid-cols-2` por `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` para 3 colunas no desktop

**2. `src/components/roas/AdsProductCard.tsx`**
- Reorganizar o layout para mostrar as 6 métricas (ROAS, GMV, Gasto, Vendas, Posição, Custo/Un) em uma linha horizontal, como na imagem de referência
- Mover o ROAS de volta para o grid junto com as outras métricas (em destaque com cor)
- Header: imagem + nome + badge "Não vinculado" + período + delete icon no canto superior direito
- Métricas: grid de 6 colunas com labels em cima e valores embaixo
- Para não vinculados: mensagem "Vincule para ver lucratividade" + botões Vincular (sólido) e Cadastrar (outline)
- Remover o ROAS destacado no canto superior direito (volta ao grid)
- Remover a barra de progresso ROAS vs empate para simplificar

### Arquivos modificados
- `src/components/roas/AdsTab.tsx`
- `src/components/roas/AdsProductCard.tsx`

