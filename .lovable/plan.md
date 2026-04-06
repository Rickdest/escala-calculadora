

## Plano: Sistema de limite de lojas por plano

### Mudanças

1. **`src/constants/pricing.ts`** — Adicionar `PLAN_STORE_LIMITS` com free=0, monthly=2, yearly=7

2. **Criar `src/hooks/useStoreLimit.ts`** — Hook que combina `useSubscription` + `useStore` para retornar `canAddStore`, `isAtLimit`, `limit`, `storeCount`

3. **`src/pages/Stores.tsx`** — Usar o hook para:
   - Desabilitar botão "+" quando no limite (mostrar ícone Lock)
   - Exibir banner de upgrade quando atingir o limite

4. **`src/pages/Paywall.tsx`** — Separar benefícios por plano (mensal mostra "Até 2 lojas", anual mostra "Até 7 lojas" com destaque em primary)

### Arquivos modificados
- `src/constants/pricing.ts`
- `src/hooks/useStoreLimit.ts` (novo)
- `src/pages/Stores.tsx`
- `src/pages/Paywall.tsx`

