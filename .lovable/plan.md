

## Diagnóstico

A loja **está conectada** ao Shopee Ads e tem 11 campanhas ativas sincronizadas. Mas o card "Volume real Shopee" aparece vazio porque:

1. **Causa raiz**: Em todos os 11 produtos o campo `keywords` em `shopee_ads_by_product` está `[]` vazio. A chamada `get_recommended_keyword_list` (Step 6 do `shopee-ads`) está rodando mas não persiste nada — provavelmente porque essa API requer aprovação adicional na Shopee, retorna 404, ou o último sync rodou em 09/abr antes da feature estar 100% pronta.

2. **Causa secundária na UI** (`ShopeeKeywordsCard.tsx`): mostra mensagem **"Conecte o Shopee Ads"** quando `keywords.length === 0` — texto errado, porque quem está aqui já tem a integração ativa. Confunde o usuário.

3. **Falta um botão pra forçar re-sync** das keywords sem precisar ir até a aba Ads.

## Plano

### 1. Forçar re-sync e logar o retorno da API (`supabase/functions/shopee-ads/index.ts`)
- Logar **sempre** (não só primeira amostra) quantas keywords vieram por item: `[SHOPEE ADS] item X: N keywords saved` ou `0 keywords (response: <status>)`.
- Logar o `error_code`/`error_message` do payload Shopee quando `kwList` vier vazio — assim vamos ver se é `error_auth`, `error_param` ou simplesmente API sem dados pra esse item.
- Aceitar **mais variantes de campo** no parser (a API às vezes retorna `suggested_keywords`, `keyword_info`, `data.keywords[]`).

### 2. Corrigir mensagem do empty state (`src/components/products/trend/ShopeeKeywordsCard.tsx`)
Substituir o atual "Conecte o Shopee Ads" por um estado mais honesto que **diferencia 3 cenários**:

| Cenário | Mensagem |
|---|---|
| Produto sem `shopee_item_id` | "Vincule esse produto a um item da Shopee pra ver volume real de busca" + link `/produtos` |
| Tem `shopee_item_id` mas ads nunca sincronizou | "Sincronize seus anúncios pra liberar volume de busca" + botão "Sincronizar Shopee Ads agora" |
| Sincronizou mas API não devolveu keywords | "A Shopee não retornou palavras pra esse item agora. Pode ser que a campanha precise de mais histórico (7+ dias) ou volume mínimo de impressões. Tente novamente em alguns dias." + botão "Tentar novamente" |

Pra distinguir os cenários, o card vai receber duas props novas: `hasShopeeItemId: boolean` e `lastAdsSync: string | null`.

### 3. Expor info no hook (`src/hooks/useProductTrend.ts`)
- Buscar `shopee_item_id` do produto e `updated_at` mais recente de `shopee_ads_by_product` pelo `item_id`.
- Expor `hasShopeeItemId` e `lastAdsSync`.

### 4. Botão "Re-sincronizar agora" no ProductTrendTab
- Quando o usuário clica, chama `supabase.functions.invoke("shopee-ads", { body: { storeId, filterItemId: shopee_item_id } })` — que já existe e aceita filtro por item.
- Depois chama `refresh(true)` pra recarregar.

### Arquivos editados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/shopee-ads/index.ts` | Logs detalhados no Step 6 + parser tolerante a mais variantes |
| `src/hooks/useProductTrend.ts` | Expõe `hasShopeeItemId`, `lastAdsSync` |
| `src/components/products/trend/ShopeeKeywordsCard.tsx` | 3 empty states honestos + botão re-sync |
| `src/components/products/trend/ProductTrendTab.tsx` | Passa novas props + handler de re-sync |

### Trade-offs
- ✅ Usuário entende exatamente por que o card está vazio
- ✅ Tem ação direta (re-sincronizar) sem sair da tela
- ✅ Logs vão revelar se a Shopee está retornando keywords ou negando — base pra decidir próximos passos
- ⚠️ Se a API da Shopee realmente não está devolvendo keywords pra essa conta (limitação de plano/volume), a feature continua sem dados — mas pelo menos a mensagem fica honesta
- ⚠️ Não cria nova tabela nem migration

