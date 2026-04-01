

## Plano: Criar Edge Function dedicada para Ads + botão "Importar Ads"

### Problema raiz

A API `get_all_cpc_ads_daily_performance` retorna **rate limit em 100% das tentativas** porque a Edge Function `shopee-sync` faz 4 chamadas pesadas antes (shop_info, products com models, orders com paginação, e só depois ads). Quando chega nos Ads, o rate limit global já foi atingido.

### Solução

**1. Nova Edge Function `shopee-ads` (isolada)**
- Função dedicada que **só** busca dados de Ads
- Não faz shop_info, products, orders — vai direto ao ponto
- Retry com delays mais longos (3s, 8s, 15s)
- Usa chunks de 15 dias (2 chamadas em vez de 5)
- Também busca `get_total_balance`

**2. Botão "Importar Ads" no header da aba**
- Substituir "Sincronizar" por **"Importar Ads"** (com ícone Shopee)
- Manter "Atualizar CSV" como fallback
- Ao clicar, chama a nova função `shopee-ads` (não `shopee-sync`)

**3. Hook `useShopeeToken` — novo método `syncAdsOnly`**
- Invoca `shopee-ads` em vez de `shopee-sync`
- Resposta mais rápida (sem esperar sync completo)

### Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/shopee-ads/index.ts` | **Novo** — Edge Function dedicada |
| `src/hooks/useShopeeToken.ts` | Adicionar `syncAdsOnly()` |
| `src/components/roas/AdsTab.tsx` | Botão "Importar Ads" chama `syncAdsOnly` |

### Detalhes técnicos

A nova function `shopee-ads`:
- Autentica via JWT (mesmo padrão do shopee-sync)
- Refresh token se necessário
- Chama `get_all_cpc_ads_daily_performance` em 2 chunks de 15 dias
- Delays de 3s entre chunks + retry com backoff (3s, 8s, 15s)
- Retorna `{ ads_by_product, period_start, period_end, ads_rate_limited }`

O frontend processa a resposta via `importFromApi` (já existente).

