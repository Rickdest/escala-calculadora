

## Redesign do ProductPicker na aba ROAS — navegação estilo select nativo

### Problema
O picker atual ocupa muito espaço vertical com card grande + 2 mini-cards + dropdown separado. No mobile (390px), fica confuso e pesado.

### Nova abordagem — Select compacto com horizontal scroll

Substituir o layout atual por um **carrossel horizontal de chips/cards compactos** (padrão comum em apps de finanças e analytics):

**`src/components/charts/RoasAnalysis.tsx` — refatorar `ProductPicker`**

1. **Layout horizontal scrollável** (sempre visível, sem dropdown):
   - Row com `flex overflow-x-auto gap-2 scrollbar-none pb-1`
   - Cada produto = chip compacto com imagem pequena (`w-6 h-6`), nome truncado (max ~80px), badge ROAS
   - Produto selecionado: `border-primary bg-primary/10 ring-2 ring-primary/30`
   - Não selecionado: `border-border bg-card opacity-70`

2. **Chip selecionado com info expandida** abaixo do carrossel:
   - Uma linha compacta mostrando: imagem + nome + preço venda + preço custo
   - Altura total: ~80px (vs ~200px+ atual)

3. **Remover**: dropdown overlay, mini-cards "Outros produtos", busca inline
   - Se >8 produtos, manter um botão "..." no final do scroll que abre modal de busca

### Resultado
- Todos os produtos visíveis de uma vez (scroll horizontal)
- Seleção com 1 toque
- ~60% menos espaço vertical
- Padrão familiar (tabs/chips de seleção)

### Arquivo modificado
- `src/components/charts/RoasAnalysis.tsx` (apenas o componente `ProductPicker`)

