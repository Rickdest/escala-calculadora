

## Ajustar ProductDetailDrawer para mostrar todas as taxas detalhadas

### Arquivo: `src/components/ProductDetailDrawer.tsx`

### Mudanças

**1. Mostrar TODOS os itens de custo, mesmo quando zero/desativados**

Atualmente, itens como Embalagem, Comissão afiliados, Campanhas e Acelera são condicionalmente ocultados. A referência mostra todos os itens sempre, com "—" quando o valor é zero.

Alterar o array `costItems` (linhas 38-54) para incluir sempre todos os itens:
- Custo do produto (sempre)
- Taxa Shopee (sempre)
- Embalagem (sempre, mesmo se 0)
- Impostos (sempre, mesmo se 0%)
- Comissão afiliados (sempre, mesmo se desativado)
- Campanhas Shopee (sempre, mesmo se desativado)
- Shopee Acelera (sempre, mesmo se 0)

**2. Ícone do botão "Editar produto"**

Trocar o ícone `Edit` (lápis) por `Sparkles` (lucide-react) para match com a referência (✨).

### Resultado
Drawer mostra breakdown completo de todas as taxas e custos, independente de estarem ativos ou não, com "—" para valores zerados.

