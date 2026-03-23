

## Extrair `calculateProduct` e `getStoreStats` para `src/lib/calculateProduct.ts`

### O que muda

Refactor puro — extrai as duas funções de cálculo do `StoreContext.tsx` para um arquivo dedicado. Zero alteração de lógica.

### Novo arquivo: `src/lib/calculateProduct.ts`

- Exporta `calculateProduct(product: Product, config: StoreConfig): ProductCalculation` — cópia exata do corpo atual (linhas 439-480)
- Exporta `getStoreStats(store: Store, calculateFn: typeof calculateProduct)` — cópia exata (linhas 482-492), recebe a função de cálculo como parâmetro para manter pureza
- Importa `Product, Store, StoreConfig, ProductCalculation, getShopeeFeeForPrice, SHOPEE_ACELERA_RATES` de `@/types/store`

### Alteração: `src/contexts/StoreContext.tsx`

- Adiciona import: `import { calculateProduct as calculateProductFn, getStoreStats as getStoreStatsFn } from '@/lib/calculateProduct'`
- Remove o import de `getShopeeFeeForPrice, ShopeeAceleraOption, SHOPEE_ACELERA_RATES` (só se não forem usados em outro lugar do arquivo — `ShopeeAceleraOption` ainda é usado no `mapDbProduct`, então mantém)
- Substitui o `useCallback` de `calculateProduct` (linhas 439-480) por: `const calculateProduct = useCallback(calculateProductFn, []);`
- Substitui o `useCallback` de `getStoreStats` (linhas 482-492) por: `const getStoreStats = useCallback((store: Store) => getStoreStatsFn(store, calculateProduct), [calculateProduct]);`

### Garantias

- Interface do context 100% idêntica — nenhum componente externo muda
- Nenhuma lógica de cálculo alterada — apenas movida
- As funções ficam testáveis independentemente fora do React

