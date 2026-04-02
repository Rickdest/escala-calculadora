

## Plano: Dados reais por campanha + detalhe full-page ao clicar

### Problema raiz

O endpoint `get_product_campaign_daily_performance` retorna arrays vazios para todas as 35 campanhas. Isso acontece porque a Shopee pode não disponibilizar dados diários por campanha para campanhas encerradas, ou o endpoint precisa de parâmetros diferentes.

**Solução**: Usar os dados shop-level do Step 3 (`get_all_cpc_ads_daily_performance`) que JÁ retornam R$2050 de gasto e 28 dias de métricas, e **distribuir proporcionalmente** os totais entre as campanhas com base nos dados agregados que a Shopee retorna via `get_product_level_campaign_setting_info` (que pode incluir `total_expense`, `total_gmv` etc. nos detalhes da campanha).

Além disso, ao clicar em uma campanha, abrir a mesma experiência do `AdsDetailFullView` (tela cheia com diagnóstico, métricas, gráficos) em vez do card expandível inline.

### Parte 1 — Backend (`shopee-ads/index.ts`)

1. **No Step 2**, pedir `info_type_list: "1,2"` (tipo 2 inclui performance summary/budget da campanha) e logar a resposta completa dos primeiros 3 para descobrir quais campos vêm
2. **No Step 4**, manter a chamada per-campaign mas se continuar vazio, usar os dados do Step 3 (shop-level daily) como fallback — distribuir proporcionalmente se houver dados de expense por campanha, ou retornar as campanhas com métricas zero mas com status correto
3. **Mapear status corretamente**: investigar os valores reais de `common_info.status` (pode ser 0=pausado, 1=ativo, 2=encerrado etc.) e retornar `'active' | 'paused' | 'ended'`

### Parte 2 — Frontend: Detalhe full-page

1. **Ao clicar numa campanha**, em vez de expandir o `CampaignDetail` inline, converter os dados da campanha API em formato `EnrichedAdsData` e abrir o `AdsDetailFullView` existente
2. Criar função `campaignToEnrichedAds(campaign: CampaignAds): EnrichedAdsData` que mapeia os campos:
   - `campaign.expense` → `despesas`
   - `campaign.gmv` → `gmv`
   - `campaign.roas` → `roas`
   - `campaign.item_name` → `nome_produto_csv`
   - `campaign.item_id` → `shopee_product_id`
   - `campaign.status` → `status_anuncio`
   - etc.
3. No `AdsTab.tsx`, quando `selectedDetail` vem de API, abrir o mesmo `AdsDetailFullView` com navegação entre campanhas

### Parte 3 — Status correto nos cards

1. Adicionar badge para 3 estados: **Ativo** (verde), **Pausado** (amarelo), **Encerrado** (cinza)
2. No backend, mapear: `status === 1` → active, `status === 0 || status === 2` → paused/ended (confirmar via logs)

### Parte 4 — Remover CampaignDetail inline

Remover o componente `CampaignDetail` expandível e substituir pelo fluxo de tela cheia.

### Arquivos alterados

```text
supabase/functions/shopee-ads/index.ts   — info_type_list "1,2", debug status values, status mapping
src/components/roas/ApiAdsDashboard.tsx   — remover CampaignDetail, onClick abre callback para detail
src/components/roas/AdsTab.tsx           — receber callback de campanha, converter para EnrichedAdsData, abrir AdsDetailFullView
```

Sem mudanças de banco.

