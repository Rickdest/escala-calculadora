

## Melhorar destaque de Posição, Vendas e Custo/Un nos cards de Ads

### Mudanças em `src/components/roas/AdsProductCard.tsx`

**1. Promover as 3 métricas secundárias para cards com mesmo estilo das primárias**
- Trocar o layout atual (row compacta `bg-secondary/50` com label+valor lado a lado) por cards verticais iguais aos de ROAS/GMV/Gasto
- Usar `rounded-xl p-2.5 border border-border/60 bg-secondary/30` — mesmo padrão visual
- Valor em cima (grande, bold), label embaixo (pequeno, muted)

**2. Posição com destaque especial**
- Valor com cor semântica via `getPositionColor` existente
- Tamanho `text-base font-extrabold` (igual ao ROAS)

**3. Vendas e Custo/Un com valores abreviados**
- Usar `fmtShort` (já existe em `adsHelpers.ts`) para Custo/Un em vez de `fmt` — evita texto cortado
- Vendas: manter `{ad.itens_vendidos} un` (já é curto)

**4. Alinhamento uniforme**
- Todos os 6 cards (2 rows de 3) com `flex flex-col items-center text-center` para centralizar e evitar cortes
- Valores com `truncate` removido — usar abreviação em vez de cortar

### Arquivo modificado
- `src/components/roas/AdsProductCard.tsx`

