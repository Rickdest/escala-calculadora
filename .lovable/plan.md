

## Correção de 6 bugs

### 1. `shopeeAcelera` hardcoded em `handleSubmit` (ProductForm.tsx ~linha 155)
Trocar `shopeeAcelera: 'none' as ShopeeAceleraOption` por `shopeeAcelera: (product?.shopeeAcelera ?? 'none') as ShopeeAceleraOption`.
Também preservar `adsRevenue` do produto: `adsRevenue: product?.adsRevenue ?? 0`.

### 2. Preview `localCalc` diverge do cálculo real (ProductForm.tsx ~linhas 59-80)
Substituir o cálculo manual por chamada a `calculateProductFn` importado de `@/lib/calculateProduct`, montando um `Product` draft e usando o `config` da loja. Isso inclui `shopeeAcelera` do produto e `adsRevenue`.

### 3. Lock no CSV inválido (useAdsData.ts)
Na verdade o código já está dentro do `try` (linha 155), então o `finally` já executa. Porém `importProductCSV` (linha 268-270) tem o mesmo padrão. Vou manter ambos claramente dentro do `try` sem mudança estrutural — o bug descrito não existe no código atual, mas vou garantir consistência de indentação.

### 4. `deleteStore` sem verificação de erro (StoreContext.tsx)
Capturar erro do `supabase.from('products').delete()` e retornar com toast se falhar, antes de deletar a loja.

### 5. `queryKey` recriada a cada render (StoreContext.tsx)
Envolver com `useMemo(() => [...], [user?.id])`.

### 6. `useEffect` de seleção de loja — dependência faltando (StoreContext.tsx)
Refatorar para usar `setCurrentStoreState(prev => ...)` eliminando a leitura direta de `currentStore`.

### Arquivos
- `src/components/forms/ProductForm.tsx` — bugs 1 e 2
- `src/hooks/useAdsData.ts` — bug 3 (confirmação de que está OK)
- `src/contexts/StoreContext.tsx` — bugs 4, 5 e 6

