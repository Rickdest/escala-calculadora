

## Diagnóstico

Dois problemas distintos causam a falha:

### 1. Edge Function crasha na inicialização
Na linha 78 de `shopee-ads/index.ts`, `getAdsCredentials()` é chamada no **nível do módulo** (fora do `Deno.serve`). Se alguma variável de ambiente estiver ausente ou inválida, a função crasheia antes de processar qualquer request — resultando em "Failed to send a request to the Edge Function".

### 2. Métricas todas zeradas
Os logs mostram 108 campanhas com `expense=0.00`. O endpoint `get_product_campaign_daily_performance` retorna entradas diárias, mas os campos de métricas estão em formatos que o `normalizeDailyEntry` não reconhece, ou a Shopee está retornando dados vazios para campanhas "ended" antigas. O filtro atual só pula campanhas com `campaign_id < 50M`, mas a maioria das 108 campanhas são "ended" e não têm dados úteis.

## Plano

### 1. Mover `getAdsCredentials()` para dentro do handler
- Remover a chamada no nível do módulo (linha 78-80)
- Chamar `getAdsCredentials()` dentro do `Deno.serve` handler e dentro de `processJob`
- Retornar erro amigável se credenciais faltarem, em vez de crashar

### 2. Adicionar log de diagnóstico na resposta da API Shopee
- No `fetchCampaignDaily`, para a **primeira campanha**, logar o JSON bruto completo de uma entrada diária (não só 600 chars) para entender o formato real que a Shopee retorna
- Isso vai revelar se as métricas estão em campos não mapeados

### 3. Filtrar campanhas "ended" de forma mais agressiva
- Pular **todas** as campanhas com status "ended" durante o Step 4 (busca individual), a menos que tenham métricas no sumário (`summary_metrics.hasData === true`)
- Isso reduz drasticamente o tempo de execução (de 108 campanhas para apenas as ativas/pausadas ou com dados reais)

### 4. Usar `summary_metrics` como fallback principal
- Se `fetchCampaignDaily` retorna entradas mas todas com métricas zeradas, usar os `summary_metrics` extraídos no Step 2 como fonte principal de dados
- Isso garante que pelo menos os totais apareçam

## Arquivos modificados
- `supabase/functions/shopee-ads/index.ts`

## Sem migration

