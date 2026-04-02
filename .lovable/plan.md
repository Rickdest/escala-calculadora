
Objetivo: corrigir a importação individual por campanha/produto na integração de Ads, sem duplicar cards e preservando a última atualização salva.

O que confirmei no código atual:
- `fetchCampaignDaily` hoje envia `campaign_id_list` no endpoint `get_product_campaign_daily_performance`.
- Os logs que você descreveu batem com isso: esse endpoint está rejeitando o formato atual.
- O fallback para `get_gms_campaign_performance` ainda não existe.
- A persistência já existe em `shopee_ads_by_product`, e o frontend já usa fallback do banco via `useApiAdsData`.
- A deduplicação no frontend já existe por `campaign_id`.
- O botão “Atualizar Dados” já faz merge parcial no estado, mas hoje depende do retorno do endpoint individual, que está falhando.

Plano de correção

1. Ajustar o Step 4 para estratégia em cascata por campanha
- Em `supabase/functions/shopee-ads/index.ts`, refatorar `fetchCampaignDaily` para tentar nesta ordem:
  1. `get_product_campaign_daily_performance` via POST com `campaign_id`
  2. `get_product_campaign_daily_performance` via GET com `campaign_id`
  3. `get_product_campaign_daily_performance` via POST com `campaign_id_list`
  4. `get_product_campaign_daily_performance` via GET com `campaign_id_list`
  5. `get_gms_campaign_performance` como fallback final, com `campaign_id_list`
- Isso cobre a divergência entre o que os logs anteriores mostraram e o diagnóstico novo, sem depender de uma única hipótese.

2. Adicionar logs enxutos por estratégia
- Logar apenas o primeiro resultado da primeira campanha em cada estratégia:
  - `DEBUG product POST singular`
  - `DEBUG product GET singular`
  - `DEBUG product POST list`
  - `DEBUG product GET list`
  - `DEBUG gms fallback`
- Manter o limite curto (`substring`) para não estourar o buffer.

3. Manter datas no formato aceito pela API e janela curta
- Preservar a lógica atual de 28 dias e uso de `DD-MM-YYYY` nas chamadas da API.
- Não mexer no formato ISO usado para salvar `period_start` e `period_end` no banco.

4. Garantir persistência da última atualização individual
- No mesmo fluxo de `shopee-ads`, manter o upsert por `(user_id, campaign_id, period_start)`.
- Quando a atualização for individual (`filterItemId`), confirmar que apenas aquela campanha retornada será atualizada no banco, sem apagar dados das demais.
- Se vier nova métrica da campanha, ela sobrescreve a versão anterior da mesma janela; ao sair e voltar, o hook `useApiAdsData` continuará carregando esse último valor salvo.

5. Evitar duplicação visual após refresh/import
- Em `src/hooks/useApiAdsData.ts`, manter a deduplicação por `campaign_id` com `updated_at` mais recente.
- Em `src/components/roas/AdsTab.tsx`, manter o merge parcial no `ads_by_campaign` e reforçar que o match seja por `campaign_id` primeiro, com fallback por `item_id` se necessário.
- Assim, importar tudo e depois atualizar um item não cria dois cards.

6. Melhorar o comportamento do botão “Atualizar Dados”
- Em `AdsTab.tsx`, ajustar o fluxo para:
  - atualizar somente a campanha retornada,
  - atualizar `selectedDetail` com os novos dados,
  - invalidar o cache persistido depois do sucesso,
  - não mostrar sucesso falso se a API não trouxer nenhuma campanha correspondente.
- Se a API voltar vazia, exibir mensagem de diagnóstico mais útil, indicando que nenhuma métrica individual foi retornada para aquele item/campanha.

Arquivos envolvidos
```text
supabase/functions/shopee-ads/index.ts   — corrigir estratégia do endpoint individual + fallback GMS + logs
src/components/roas/AdsTab.tsx           — reforçar merge parcial e atualização do detail view
src/hooks/useApiAdsData.ts               — manter deduplicação e fallback persistido
```

Detalhes técnicos
```text
Fluxo proposto do Step 4

Campanha X
  ├─ product_daily POST com campaign_id
  ├─ product_daily GET com campaign_id
  ├─ product_daily POST com campaign_id_list
  ├─ product_daily GET com campaign_id_list
  └─ gms_campaign_performance com campaign_id_list

Se qualquer estratégia retornar entries:
  -> processa métricas
  -> faz upsert no banco
  -> atualiza card específico no frontend

Se todas falharem:
  -> mantém dados anteriores salvos
  -> mostra feedback de ausência de retorno individual
```

Resultado esperado
- Não aparecem campanhas duplicadas após importar ou atualizar.
- A última atualização individual permanece salva ao sair e voltar.
- O botão “Atualizar Dados” passa a tentar corretamente o endpoint por campanha.
- Se o endpoint principal falhar para certos tipos de campanha, o fallback GMS consegue cobrir parte desses casos.
- Os logs passam a mostrar qual estratégia realmente retornou dados para cada tipo de campanha.
