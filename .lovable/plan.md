

## Ajustar Calculadora Rápida para match com referência

### Arquivo: `src/components/home/QuickCalculator.tsx`

### 1. Layout dos inputs: 3 colunas → 2 colunas + 1 full-width
- Mudar grid de `grid-cols-3` para `grid-cols-2`
- Mover "EMBALAGEM (OPCIONAL)" para fora do grid, como input full-width abaixo
- Label: manter "EMBALAGEM (OPCIONAL)" (não "OPC.")

### 2. Tamanho dos inputs
- Aumentar altura dos inputs de `h-11` para `h-12`
- Aumentar texto do input de `text-sm` para `text-base` (16px)
- Texto do "R$" prefix de `text-[11px]` para `text-sm`

### 3. Cards de resultado: centralizado → left-aligned
- Trocar `items-center justify-center` por `items-start`
- Valor em cima, label embaixo (já está assim, mas alinhar à esquerda)
- Aumentar texto do valor de `text-[18px]` para `text-[22px]`

### 4. Sem mudanças no ProductDetailDrawer
- O drawer já está conforme a segunda imagem de referência

### Arquivos modificados
- `src/components/home/QuickCalculator.tsx`

