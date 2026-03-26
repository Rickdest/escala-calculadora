

## Centralizar e ajustar cores na seção ADS do ProductCard

### Arquivo: `src/components/cards/ProductCard.tsx`

### Mudanças (linhas 251-278)

1. **Centralizar conteúdo** dos 3 cards de Ads — trocar `flex flex-col` por `flex flex-col items-center text-center`
2. **Posição em amarelo** — trocar `text-foreground` por `text-warning` no valor da posição
3. **Centralizar labels e valores** — labels e sub-textos ficam centralizados dentro de cada card

Resultado visual: cada card (Posição, ROAS, Custo/Un) com label, valor e sub-texto centralizados, posição em amarelo.

