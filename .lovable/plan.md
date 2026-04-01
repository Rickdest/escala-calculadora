

## Plano: Corrigir sincronização de Ads via API Shopee

### Problema raiz

Os logs da Edge Function mostram claramente:

```
Ads daily performance response error: ads_rate_limit_total_api
Ads entries count: 0
```

A API `v2.ads.get_all_cpc_ads_daily_performance` está retornando erro de **rate limit**, resultando em 0 anúncios. O código não faz retry e simplesmente retorna dados vazios.

### Correções

**1. Adicionar retry com backoff na Edge Function `shopee-sync/index.ts`**

Na função `fetchAdsPerformance`, implementar retry (até 3 tentativas com delay de 2s, 4s) quando o erro for `ads_rate_limit_total_api`. A API de Ads tem limites agressivos.

**2. Dividir o range de datas em chunks menores**

Em vez de pedir 30 dias de uma vez, dividir em blocos de 7 dias (4 chamadas). Isso reduz a chance de rate limit e permite obter dados parciais mesmo se uma chamada falhar.

**3. Tentar endpoint alternativo como fallback**

Se `get_all_cpc_ads_daily_performance` continuar falhando, usar `v2.ads.get_product_campaign_daily_performance` como fallback, que pode ter limites separados.

**4. Retornar erro claro ao frontend quando rate-limited**

Atualmente o frontend mostra "sem dados de Ads disponíveis" — deveria mostrar "API limitada temporariamente, tente novamente em alguns minutos".

### Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/shopee-sync/index.ts` | Retry com backoff + chunks de 7 dias + erro explícito |
| `src/components/roas/AdsTab.tsx` | Mostrar mensagem clara quando rate-limited |

### Detalhes técnicos

```text
fetchAdsPerformance():
  Para cada chunk de 7 dias:
    Tentativa 1 → POST get_all_cpc_ads_daily_performance
    Se ads_rate_limit → sleep 2s → Tentativa 2
    Se ads_rate_limit → sleep 4s → Tentativa 3
    Se ainda falhar → marcar ads_rate_limited = true no response
  
  Agregar todos os chunks por item_id
  Retornar { ads_by_product, ads_rate_limited: bool }
```

No frontend:
```text
if (result.results.ads_performance?.ads_rate_limited) {
  toast.warning('API de Ads temporariamente limitada. Tente novamente em 2-3 minutos.');
}
```

