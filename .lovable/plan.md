

## Redesign ProductCard — Estilo do Mockup

Replicar o layout da imagem de referência com cards mais espaçados, badges coloridos para Margem/Lucro, botão "Importar Ads CSV" centralizado, e métricas de Ads em pills individuais.

### Mudanças no `src/components/cards/ProductCard.tsx`

**Header (Row 1):**
- Imagem maior: `w-14 h-14 rounded-xl`
- Nome em `text-base font-bold`
- Preço e Custo em linhas separadas: `Preço: R$ 49,90` (preço em laranja) e `Custo: R$ 18,00`

**Métricas (Row 2):**
- Remover labels separados e progress bar
- Dois badges lado a lado, centralizados:
  - `Margem: 22,4%` — pill com `bg-success/15 text-success rounded-lg px-3 py-1.5 font-bold`
  - `Lucro: R$ 11,20` — pill com mesma cor semântica
- Cores: success para margem boa, warning para atenção, destructive para prejuízo

**Botão Importar Ads (Row 3):**
- Botão centralizado com ícone BarChart3 + texto "Importar Ads CSV"
- Estilo: `border border-border rounded-lg px-4 py-2 text-sm font-bold`
- Aparece sempre (com ou sem ads) — se já tem ads, não mostra

**Métricas de Ads (Row 4):**
- Pills individuais em wrap: `Pos. #14`, `ROAS 10,49`, `ACOS 9,53%`, `ACOS 10,39%`, `119 vendidos`
- Cada pill: `bg-surface-2 rounded-lg px-2.5 py-1 text-xs font-bold`
- Posição com ícone/dot colorido

**Canais (Row 5):**
- Manter chips existentes

### Espaçamento geral
- Padding do card: `p-4`
- Gaps maiores entre seções: `mt-3`
- Conteúdo centralizado (métricas e botão)

### Arquivo
- `src/components/cards/ProductCard.tsx`

