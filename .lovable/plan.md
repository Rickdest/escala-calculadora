

## Plano: Integração Shopee por Loja

### Situação Atual

Hoje a tabela `shopee_tokens` está vinculada apenas ao `user_id`. Isso significa que **todas as lojas compartilham a mesma conexão Shopee**. Não há como conectar lojas diferentes a contas Shopee diferentes.

O mesmo vale para `shopee_ads_by_product`, `ads_data`, `product_ads_metrics` — todos vinculados ao `user_id`, sem distinção por loja.

### O que muda

Cada loja poderá ter sua própria conexão Shopee (Seller e Ads independentes), permitindo gerenciar múltiplas contas Shopee em paralelo.

### Etapas

#### 1. Migração: adicionar `store_id` às tabelas de integração

- `shopee_tokens`: adicionar coluna `store_id uuid` (nullable inicialmente para não quebrar dados existentes)
- `shopee_ads_by_product`: adicionar `store_id uuid`
- Atualizar unique constraints para incluir `store_id`
- RLS policies permanecem baseadas em `user_id` (segurança), mas queries filtram por `store_id`

#### 2. Página de Lojas — mostrar status de integração por loja

No card de cada loja em `/stores`, adicionar indicadores visuais:
- Badge "Shopee Seller ✓" / "Ads ✓" quando conectada
- Botão "Conectar Shopee" no menu de cada loja
- Ao clicar, redireciona para Integrações com a loja selecionada

#### 3. Página de Integrações — filtrar por loja selecionada

- Mostrar qual loja está sendo configurada (usar `currentStore`)
- `useShopeeToken` passa a aceitar `storeId` como parâmetro
- Queries de token filtram por `store_id` além de `user_id` e `app_type`
- OAuth flow envia `store_id` no state para vincular o token à loja correta

#### 4. Edge Functions — receber e persistir `store_id`

- `shopee-auth`: incluir `store_id` no state do OAuth
- `shopee-callback`: salvar `store_id` no token
- `shopee-ads`: filtrar por `store_id` ao buscar token e salvar dados
- `shopee-sync`: idem

#### 5. Hooks e dados de Ads — filtrar por loja

- `useAdsData`, `useApiAdsData`: filtrar por `currentStore.id`
- `AdsTab`: mostrar apenas dados da loja selecionada

### Arquivos modificados

**Migração SQL:**
- Nova migration adicionando `store_id` às tabelas `shopee_tokens`, `shopee_ads_by_product`

**Frontend:**
- `src/hooks/useShopeeToken.ts` — aceitar `storeId`, filtrar queries
- `src/pages/Integracoes.tsx` — usar `currentStore.id` nas operações
- `src/pages/Stores.tsx` — mostrar badges de integração por loja
- `src/hooks/useApiAdsData.ts` — filtrar por `store_id`
- `src/hooks/useAdsData.ts` — filtrar por `store_id`

**Edge Functions:**
- `supabase/functions/shopee-auth/index.ts`
- `supabase/functions/shopee-callback/index.ts`
- `supabase/functions/shopee-ads/index.ts`
- `supabase/functions/shopee-sync/index.ts`

### Compatibilidade

Dados existentes (sem `store_id`) continuam funcionando — a query faz fallback para registros com `store_id IS NULL`. A migração pode opcionalmente atribuir o `store_id` da primeira loja do usuário aos tokens existentes.

