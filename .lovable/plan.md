

## Plano: Corrigir checkout no SubscriptionModal e limpar código morto

### Problema principal

O `SubscriptionModal` (usado na Home) chama `openCheckout()` que depende de `VITE_CAKTO_URL` — variável **não configurada**. O botão "Quero acesso completo" falha silenciosamente.

Já o `Paywall.tsx` funciona porque usa URLs hardcoded do `PRICING`.

### Correções

#### 1. Unificar checkout via PRICING (sem depender de env var)

**`src/services/checkout.service.ts`** — Alterar `openCheckout` para usar `PRICING.checkoutMonthly` como fallback quando `VITE_CAKTO_URL` não está definido:

```typescript
import { PRICING } from '@/constants/pricing';

export function openCheckout(email?: string) {
  const url = buildCheckoutUrl(email);
  const fallback = PRICING.checkoutMonthly;
  const target = url || fallback;
  window.open(target, '_blank', 'noopener,noreferrer');
}
```

#### 2. Remover código morto

- Deletar `src/components/TrialExpiredBlock.tsx` — não é importado em nenhum lugar

### Arquivos modificados
- `src/services/checkout.service.ts` — fallback para PRICING
- `src/components/TrialExpiredBlock.tsx` — deletar

