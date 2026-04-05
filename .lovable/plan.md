
Objetivo

Corrigir 3 problemas juntos:
1. a aba Ads dispara importação sozinha toda vez que abre,
2. o loading fica com cara de “travado”,
3. a importação atual salva campanhas, mas com métricas zeradas.

O que encontrei

- Em `src/components/roas/AdsTab.tsx`, a importação automática roda no `useEffect` sempre que a aba monta.
- Esse efeito usa `hasPersistedApiData`, mas não espera o carregamento de `useApiAdsData()`. Então a aba abre, ainda não viu os dados persistidos, e já dispara importação de novo.
- Como a aba é remontada ao trocar de tab, o `autoSyncAttempted` volta para `false` e o ciclo se repete.
- No backend, a função `shopee-ads` realmente rodou e gravou 108 registros para seu usuário, então não é problema de permissão.
- Porém os registros foram salvos com `impressions/clicks/expense/gmv/orders = 0`, e os logs mostram também `connection closed before message completed`, ou seja: a coleta está demorando demais e ainda está interpretando a resposta errada/zerada.

Plano

1. Parar a autoimportação genérica da aba
- Remover o `useEffect` que importa sempre ao abrir Ads.
- Trocar por um gatilho único pós-conexão:
  - em `Integracoes`, após conectar Ads, mostrar CTA “Abrir análise de Ads”;
  - navegar para algo como `/roas?tab=ads&startAdsImport=1`;
  - a aba Ads só autoimporta nessa navegação específica e só uma vez.

2. Corrigir o estado visual de importação
- Em `AdsTab`, usar também o loading de `useApiAdsData()` antes de decidir qualquer sync.
- Trocar o banner “infinito” por um status compacto no cabeçalho/botão com o “S” girando.
- Mostrar estados claros: preparando, importando, concluído, falhou.
- Em erro, parar o spinner imediatamente e exibir ação de retry.

3. Refatorar a importação pesada para job assíncrono
- Criar uma tabela de jobs, por exemplo `shopee_ads_import_jobs`.
- O endpoint inicial só enfileira o job e responde rápido.
- O processamento pesado roda separado e atualiza status no banco.
- O frontend faz polling do job e recarrega `shopee_ads_by_product` ao concluir.
- Isso elimina timeout do cliente e evita a sensação de travamento.

4. Corrigir o parsing das métricas zeradas
- Revisar `supabase/functions/shopee-ads/index.ts` para ler métricas diárias com a mesma normalização já usada em `extractCampaignSummaryMetrics`, inclusive campos aninhados como `performance_info`, `stats` e `report_info`.
- Se vierem 28 entradas mas todas zeradas, tratar como payload inválido/incompleto e usar fallback com `summary_metrics` da campanha.
- Adicionar logs diagnósticos curtos só para o primeiro caso zerado, para validar o formato real retornado pela Shopee nessa conta.

5. Melhorar a mensagem de tela quando houver campanhas sem números úteis
- Se existirem linhas persistidas mas tudo vier zerado, não mostrar apenas “Sem dados no período”.
- Mostrar um estado mais honesto, por exemplo:
  “Campanhas encontradas, mas a Shopee retornou métricas zeradas nesta sincronização.”
- Manter visível a última tentativa e o botão de reprocessar.

Arquivos principais

- `src/components/roas/AdsTab.tsx`
- `src/hooks/useApiAdsData.ts`
- `src/components/charts/RoasAnalysis.tsx`
- `src/pages/Integracoes.tsx`
- `supabase/functions/shopee-ads/index.ts`
- nova migration para a fila de importação

Fluxo proposto

```text
Integrações (Ads conectada)
  -> botão "Abrir análise de Ads"
  -> /roas?tab=ads&startAdsImport=1
  -> cria job de importação
  -> UI mostra S girando no botão/status
  -> polling acompanha queued/running/done/failed
  -> ao concluir, recarrega dados persistidos
```

Detalhes técnicos

- Não parece ser problema de RLS: token e registros já existem para o usuário correto.
- O problema atual é a soma de 4 fatores:
  1) autoimport no mount da aba,
  2) falta de espera pelo carregamento dos dados persistidos,
  3) request síncrona longa demais,
  4) mapeamento da resposta diária salvando zero.
- Na tabela de jobs, a política deve permitir ao usuário autenticado ver/inserir apenas os próprios jobs; atualização fica pelo backend com privilégio de serviço.
