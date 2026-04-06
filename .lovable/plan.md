
Objetivo: corrigir o salvamento/atualização do posicionamento na tela de detalhes da aba Ads, porque hoje o CSV pode “importar com sucesso” sem refletir a posição visível.

1. Corrigir a origem do dado de posição no detalhe
- Problema encontrado: a UI do detalhe lê `ad.posicao_media` do objeto recebido em `AdsDetailFullView`, mas o upload “Importar CSV” dentro do bloco Histórico salva em `product_ads_metrics`, não em `ads_data`.
- Resultado: o toast confirma importação, porém o card de posição continua “—”.
- Ajuste: unificar o comportamento para que CSV de performance com posição atualize também o registro que abastece a tela (`ads_data`) quando o detalhe aberto estiver baseado em anúncio/CSV, e mantenha `product_ads_metrics` apenas como persistência complementar.

2. Atualizar o detalhe aberto após importação
- Em `AdsTab.tsx`, após `handlePositionFile`, além de `reload()`, reconstruir `selectedDetail` com os dados recém-carregados.
- Hoje o estado do detalhe permanece com o snapshot antigo; por isso a posição pode até salvar no banco, mas não reaparece no modal aberto.
- Para campanhas API, fazer merge do `avg_position` importado no item equivalente (`shopee_product_id`) ao recalcular `selectedDetail`.

3. Remover a divergência entre os dois fluxos de CSV
- Hoje existem dois caminhos:
  - botão “Importar CSV do Produto” → `importProductCSV` → salva em `ads_data`
  - botão “Importar CSV” no histórico → `handleImportCSV`/`upsertMetrics` → salva em `product_ads_metrics`
- Ajuste: tratar CSV de posicionamento/performance no detalhe com o mesmo pipeline do import de posição, reaproveitando a lógica que já marca `posicao_importada` e preenche `posicao_media` em `ads_data`.

4. Reforçar o matching do registro correto
- Priorizar vínculo por `shopee_product_id`.
- Se houver `targetAdsDataId`, atualizar exatamente essa row.
- Se não houver `targetAdsDataId`, localizar a row visível por `shopee_product_id` + sobreposição de período antes de inserir nova.
- Evitar que a importação crie registro órfão em `product_ads_metrics` sem efeito visual na lista/detalhe.

5. Melhorar feedback para o usuário
- Diferenciar os toasts:
  - “Posição atualizada no anúncio”
  - “CSV salvo apenas como histórico”
  - “Nenhum anúncio compatível encontrado para aplicar a posição”
- Isso evita falso positivo de sucesso quando só houve persistência parcial.

6. Verificação final
- Validar os 2 pontos visuais:
  - KPI “Posição” no topo do detalhe
  - card “Posicionamento” na aba Métricas
- Confirmar também que a lista de anúncios mostra `#posição` após reabrir o detalhe.

Detalhes técnicos
- Arquivos principais:
  - `src/components/roas/AdsDetailFullView.tsx`
  - `src/components/roas/AdsTab.tsx`
  - `src/hooks/useAdsData.ts`
- Causa raiz identificada:
  - `product_ads_metrics.avg_position` é salvo por um fluxo
  - `AdsDetailFullView` renderiza `ad.posicao_media`
  - `ad.posicao_media` vem de `ads_data`/API, não de `product_ads_metrics`
- Estratégia recomendada:
  - manter `product_ads_metrics` para histórico complementar
  - garantir que CSV de posicionamento alimente `ads_data` (ou atualize o estado derivado da API) para refletir na UI imediatamente
