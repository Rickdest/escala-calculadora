

## Redesign dos cards da aba Análise de Ads — alinhar ao estilo do ProductCard

### Objetivo
Aplicar o mesmo padrão visual do `ProductCard` (aba Produtos) nos cards da aba Análise de Ads, mantendo todas as informações existentes mas melhor organizadas.

### Mudanças em `src/components/roas/AdsProductCard.tsx`

**1. Header — alinhar ao ProductCard**
- Imagem: `w-12 h-12 rounded-xl` (igual ProductCard, hoje é `w-10 h-10 rounded-lg`)
- Placeholder: `bg-secondary` em vez de `bg-surface-2`
- Subtítulo: exibir período + badge na segunda linha com texto mais legível
- Container: `rounded-2xl` em vez de `rounded-xl`, padding `p-4`

**2. Métricas principais — grid 3 colunas com cards internos (igual ProductCard)**
Substituir o grid de 6 colunas plano por 3 cards com borda semântica:
- **ROAS**: valor grande com cor semântica (success/warning/destructive) + label
- **GMV**: valor formatado + label
- **Gasto**: valor formatado + label

Cada um em `rounded-xl p-2.5 border` com fundo sutil baseado na cor.

**3. Métricas secundárias — grid 3 colunas estilo secundário**
Row adicional com cards menores (`bg-secondary/50 rounded-lg`):
- **Posição**: `#N` com cor semântica
- **Vendas**: `N un`
- **Custo/Un**: valor formatado

**4. Botões e ações — manter lógica atual**
- Não vinculado: warning + botões Vincular/Cadastrar (sem mudança de estilo)
- Vinculado: ícone link no header + warning se sem preço
- Delete: ícone no header (sem mudança)

**5. Score de eficiência — mover para junto do ROAS**
Se vinculado e com score, mostrar como subtexto no card de ROAS.

### Arquivo modificado
- `src/components/roas/AdsProductCard.tsx`

