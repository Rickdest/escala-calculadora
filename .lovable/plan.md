
Objetivo

Corrigir a causa real do problema. Não vou tratar isso como falha de deploy manual via CLI, porque neste projeto com Lovable Cloud as funções de backend já estão sendo publicadas automaticamente.

O que eu confirmei

- `supabase/config.toml` já registra `shopee-sync` e `shopee-ads`.
- Os logs do backend mostram a versão nova de `shopee-ads` executando de verdade, com mensagens do código atual:
  - `[SHOPEE ADS] Starting ads sync...`
  - `campaign_id_list RESPONSE: ...`
  - `daily_performance RESPONSE: ...`
- Então os eventos de `boot`/`shutdown` por si só são ruído normal do runtime; eles não provam ausência de publicação.

Diagnóstico real

1. `get_product_level_campaign_id_list` está retornando `response.campaign_list`, mas o código tenta ler `response.campaign_id_list`.
   Resultado: o app interpreta como `0` campanhas mesmo quando a API trouxe várias.

2. `get_all_cpc_ads_daily_performance` está falhando por formato de data.
   O log atual retornou:
   `Wrong parameters... please pass DD-MM-YYYY format`
   Hoje o código envia `YYYY-MM-DD`.

3. `shopee-sync` ficou acumulando Ads junto com loja/produtos/pedidos.
   Isso piora debug, aumenta latência e pode esbarrar em limite da API sem necessidade.

4. O frontend hoje esconde erros reais atrás de mensagens genéricas como “nenhum dado” ou “erro ao sincronizar”.

Plano atualizado

1. Corrigir `shopee-ads`
   - Ajustar a leitura da lista de campanhas para aceitar o shape real:
     `response.campaign_list[].campaign_id`
   - Manter fallback para outros shapes, mas usar o formato real como principal.
   - Trocar o formatador de datas para `DD-MM-YYYY`.
   - Manter logs completos das respostas e adicionar logs finais claros:
     quantidade de campanhas, detalhes carregados, entries de performance e saldo.

2. Corrigir `shopee-sync`
   - Remover a etapa de Ads do fluxo principal e voltar o `shopee-sync` para o escopo correto:
     loja + produtos + pedidos/performance de vendas.
   - Adicionar logs explícitos de início/fim e por seção, para não parecer “sem logs do código”.
   - Com isso, os fluxos de produtos e performance deixam de depender de chamadas de Ads.

3. Ajustar o frontend para chamar a função certa
   - `src/hooks/useShopeeToken.ts`
     - separar semanticamente:
       - `syncStoreData` -> chama `shopee-sync`
       - `syncAdsOnly` -> chama `shopee-ads`
     - evitar o nome atual `syncAds`, que hoje induz confusão.
   - `src/pages/Performance.tsx`
     - usar o fluxo de loja/pedidos (`shopee-sync`), não o de Ads.
   - `src/components/produtos/ShopeeImportModal.tsx`
     - usar o fluxo de produtos (`shopee-sync`) e mostrar erro específico se a seção de produtos falhar.
   - `src/components/roas/AdsTab.tsx`
     - continuar usando só `shopee-ads`.

4. Melhorar as mensagens de erro na UI
   - Exibir mensagens específicas vindas de `result.errors` e das respostas da API, em vez de cair sempre em toast genérico.
   - Diferenciar estes casos:
     - loja conectada mas sem pedidos
     - loja conectada mas sem campanhas
     - erro de parâmetro/data
     - limite temporário da API
     - falha na importação de produtos

5. Verificação depois da correção
   - Backend:
     - confirmar nos logs que `shopee-ads` passa a mostrar campanhas > 0
     - confirmar que some o erro de data `DD-MM-YYYY`
     - confirmar logs de início/fim do `shopee-sync`
   - UI:
     - aba Performance carrega pedidos e resumo
     - modal de importar produtos mostra lista e botão no rodapé
     - aba Ads importa dados da API sem cair em “0 campanhas” falso

Detalhes técnicos

```text
Fluxo correto
  Produtos / Pedidos / Performance de vendas -> shopee-sync
  Ads / ROAS / saldo de anúncios            -> shopee-ads
```

Sem mudanças de banco.

Sem workflow de GitHub neste ciclo.
Motivo: isso não corrige o bug atual e criaria um segundo caminho de publicação desnecessário para um projeto que já roda no Lovable Cloud.
