

## Redesign da seção ADS no ProductCard — apenas linha 1

### Arquivo: `src/components/cards/ProductCard.tsx`

### 1. Adicionar `spend` à interface `adsMetric`
Adicionar campo `spend?: number` na interface para calcular custo/unidade.

### 2. Substituir seção de chips (linhas 243-266) por grid estruturado

Layout:
```text
● ADS SHOPEE
┌──────────┬──────────┬──────────────────┐
│ POSIÇÃO  │  ROAS    │   CUSTO/UN       │
│  #14     │  10.49   │   R$4,86         │
│          │direto 10.│   119 vendidos   │
└──────────┴──────────┴──────────────────┘
```

- Header: dot verde + "ADS SHOPEE" em uppercase
- Grid `grid-cols-3` com 3 cards (`rounded-xl border bg-secondary/30 p-2.5`):
  - **Posição**: label "POSIÇÃO", valor `#XX` com cor dinâmica
  - **ROAS**: label "ROAS", valor principal, sub-texto "direto X.XX" se disponível
  - **Custo/Un**: label "CUSTO/UN", valor `spend/itemsSold`, sub-texto "XX vendidos"

### 3. Passar `spend` em `Products.tsx`
O `metricsMap[id]` já contém `spend` do `AdMetricDerived`. Apenas adicionar ao spread ou mapear explicitamente.

### Arquivos modificados
- `src/components/cards/ProductCard.tsx`
- `src/pages/Products.tsx` (passar `spend`)

