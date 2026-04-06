

## Plano: Corrigir origem do Preço de Venda no card Economia por Venda

### Problema

Linha 1320 de `AdsDetailFullView.tsx`:
```typescript
const salePrice = product?.salePrice || (ad.itens_vendidos > 0 ? ad.gmv / ad.itens_vendidos : ad.gmv);
```

Quando o produto está vinculado com `salePrice = 49.90`, o valor correto deveria aparecer. Mas o fallback `gmv / itens_vendidos` (= 51.53) é usado quando `product?.salePrice` é falsy (0 ou undefined). É possível que o produto vinculado não tenha `salePrice` populado corretamente no objeto `ad.product`.

### Correção

1. **Priorizar `product.salePrice`** — só usar fallback de GMV se realmente não houver produto vinculado
2. Mudar a lógica para:

```typescript
const salePrice = product?.salePrice && product.salePrice > 0
  ? product.salePrice
  : (ad.itens_vendidos > 0 ? ad.gmv / ad.itens_vendidos : ad.gmv);
```

3. Adicionar indicador visual de onde vem o preço — se veio do fallback (GMV), mostrar "(estimado)" ao lado do valor

### Investigação adicional

Verificar como `ad.product` é populado no merge — pode ser que o vínculo existe mas o campo `salePrice` não está sendo trazido. Se for o caso, corrigir o mapeamento também.

### Arquivo
- `src/components/roas/AdsDetailFullView.tsx` — linha 1320

