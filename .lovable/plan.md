

## Corrigir cálculo de margem/lucro — remover adsRevenue do lucro

### O bug
Linha 35 de `calculateProduct.ts`:
```
netProfit = grossRevenue + adsRevenue - totalCosts
```
O `adsRevenue` vem do CSV de ads importado (ex: R$900) e está sendo somado ao lucro unitário do produto, inflando margem de 31% para 3033%.

### A correção

**Arquivo: `src/lib/calculateProduct.ts`**

Remover `adsRevenue` da fórmula de lucro. O lucro unitário do produto deve ser apenas `grossRevenue - totalCosts`:

```typescript
// ANTES (linha 35)
const netProfit = grossRevenue + adsRevenue - totalCosts;

// DEPOIS
const netProfit = grossRevenue - totalCosts;
```

Manter `adsRevenue` no retorno do objeto para que a aba Ads possa usá-lo separadamente, mas ele não deve afetar `netProfit` nem `realMargin`.

Também remover `adsCost` do `totalCosts` (linha 34) — custos de ads pertencem à análise de ads, não ao cálculo de margem do produto:

```typescript
// ANTES
const totalCosts = product.costPrice + packagingCost + adsCost + totalShopeeFee + ...

// DEPOIS  
const totalCosts = product.costPrice + packagingCost + totalShopeeFee + ...
```

### Resultado esperado para o Cropped (R$30 venda, R$10 custo)
- Taxa Shopee: 20% × 30 = R$6,00 + R$4,00 fixo = R$10,00
- Total custos: R$10 + R$10 = R$20,00
- Lucro: R$30 - R$20 = R$10,00
- Margem: 10/30 = 33.3%

### Teste existente
Atualizar `src/test/calculateProduct.test.ts` — o teste atual espera `netProfit = 40` para R$100/R$30, que já não inclui adsRevenue (baseProduct tem adsRevenue=0), então os testes existentes devem continuar passando.

