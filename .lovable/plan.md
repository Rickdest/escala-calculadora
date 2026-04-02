
Objetivo

Corrigir o motivo real de o botão “Importar Ads” continuar trazendo “Nenhum dado”, sem misturar produtos/pedidos no fluxo.

O que já confirmei no código e nos logs

- O botão de Ads já está isolado corretamente:
  - `AdsTab` chama `handleImportAds`
  - `handleImportAds` chama `syncAdsOnly()`
  - `syncAdsOnly()` invoca apenas `shopee-ads`
- Ou seja: hoje o botão “Importar Ads” já ignora o restante. O problema não está no botão nem no `shopee-sync`.
- Os logs mostram 2 bugs restantes no backend:
  1. `get_product_level_campaign_setting_info` retorna `common_info.item_id_list`, mas o código lê `d.item_id`, então o mapa `campaign_id -> item_id` fica vazio.
  2. `get_all_cpc_ads_daily_performance` está falhando com `ads.performance.error_date_in_future`, então a função termina com `Entries: 0, Products: 0` e a UI mostra a mensagem genérica.

Plano de correção

1. Corrigir `supabase/functions/shopee-ads/index.ts`
- Ajustar o parsing dos detalhes da campanha para ler:
  - `campaign_id`
  - `common_info.item_id_list[0]`
  - `common_info.ad_name`
- Montar um mapa correto `campaign_id -> item_id` e usar esse mapa na agregação por produto.
- Corrigir o cálculo do período:
  - parar de usar a data “de hoje” em UTC como base direta
  - gerar `start_date` e `end_date` em data local segura da loja/BR
  - usar `end_date` conservador para evitar `error_date_in_future`
  - manter o intervalo dentro do limite aceito pela API

2. Melhorar o retorno do backend
- Não tratar erro da API como “lista vazia”.
- Incluir no payload campos claros como:
  - `api_error`
  - `api_message`
  - `campaign_count`
  - `campaign_to_item_count`
  - `raw_entry_count`
- Diferenciar estes casos:
  - campanhas encontradas, mas API rejeitou a data
  - campanhas encontradas, mas sem performance no período
  - nenhuma campanha encontrada
  - rate limit

3. Ajustar a UI de Ads
- Em `src/components/roas/AdsTab.tsx`, manter o botão chamando só `syncAdsOnly()`.
- Trocar o toast genérico “Nenhum dado de Ads disponível na API.” por mensagens baseadas no erro real vindo do backend.
- Exemplo de comportamento:
  - erro de data -> mostrar erro específico
  - campanhas > 0 e entries = 0 -> avisar “sem métricas no período”
  - campaigns = 0 -> avisar “nenhuma campanha encontrada”

4. Ajuste leve no hook
- Em `src/hooks/useShopeeToken.ts`, manter o fluxo atual, mas propagar melhor erro estruturado se `shopee-ads` responder com falha de API em vez de dados.

Verificação após implementar

- Logs esperados:
  - `campaignToItem map size > 0`
  - resposta de `daily_performance` sem `error_date_in_future`
  - `Entries > 0` quando houver performance
- UI esperada:
  - “Importar Ads” continua importando só Ads
  - não aparece mais o toast enganoso de “Nenhum dado...” quando o problema for data/API
  - se houver métricas, `importFromApi` salva em `ads_data`

Detalhes técnicos

```text
Fluxo correto já existente:
AdsTab -> syncAdsOnly -> shopee-ads -> importFromApi

Bug restante:
campaign_details.common_info.item_id_list[]
em vez de d.item_id

+
end_date gerada de forma que a Shopee enxerga como data futura
```

Sem mudanças de banco.
