

## Correções no fluxo de importação de Ads via Shopee API

### 1. Formato de data — JÁ CORRIGIDO ✓
Linhas 261-262 de `shopee-ads/index.ts` já usam `toISODateBR`. Nenhuma mudança necessária.

### 2. Logging de erros HTTP em `_shared/shopee.ts`
Em `shopeeGet` (linha 125-126) e `shopeePost` (linha 151-156), adicionar verificação de `res.ok` antes de `.json()`. Se `!res.ok`, logar status + body e retornar objeto de erro.

### 3. Logging do response bruto no Step 3
Em `shopee-ads/index.ts`, após a chamada do Step 3 (linha 326), adicionar log do response bruto antes do parsing (linha 327).

### 4. Persistência — Frontend lê de `shopee_ads_by_product`

**4a. Criar `src/hooks/useApiAdsData.ts`**
- Hook React Query que busca `shopee_ads_by_product` filtrado por `user_id`
- Retorna dados persistidos + função `invalidate`

**4b. Modificar `AdsTab.tsx`**
- Importar `useApiAdsData` e `useQueryClient`
- Se `apiAdsData` (memória) estiver null, usar dados do banco como fallback, montando o objeto `ApiAdsData` (summary + ads_by_campaign) a partir das rows
- Após `syncAdsOnly` bem-sucedido, chamar `queryClient.invalidateQueries(['shopee-ads-by-product'])`
- Isso garante que ao recarregar a página, os dados aparecem imediatamente

### 5. Redeploy
As edge functions `shopee-ads` e `_shared/shopee.ts` serão redeployadas automaticamente.

### Arquivos alterados

```text
supabase/functions/_shared/shopee.ts       — HTTP error logging em shopeeGet/shopeePost
supabase/functions/shopee-ads/index.ts     — log bruto Step 3
src/hooks/useApiAdsData.ts                 — NOVO hook para ler shopee_ads_by_product
src/components/roas/AdsTab.tsx             — usar dados persistidos como fallback
```

