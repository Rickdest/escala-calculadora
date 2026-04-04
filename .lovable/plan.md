
Resumo do diagnóstico

- Sim, continuam sendo necessárias 2 autorizações: uma para Seller e outra para Ads, porque são 2 apps diferentes da Shopee. Um token não libera o outro.
- O problema principal não parece mais ser o domínio. Pelos logs, ao clicar em Ads o sistema está gerando OAuth de `app_type=ads` com o Partner ID do Seller (`2032348`), então o botão de Ads está abrindo o fluxo errado.
- Para a conta logada agora, existe token Seller no banco, mas não existe token Ads. Isso explica a sensação de “conectou em outra” / “continua quebrando”.
- A tela também usa `currentStore.name` como nome da conta conectada, mas isso é a loja interna do app, não a conta real da Shopee. Isso deixa o painel confuso.

Plano de correção

1. Corrigir o app usado no OAuth de Ads
- Ajustar a resolução de credenciais do app Ads para nunca cair silenciosamente no app Seller.
- Se as credenciais Ads estiverem inválidas/ausentes, retornar erro claro em vez de abrir o OAuth errado.
- Garantir que `shopee-auth` e `shopee-callback` usem o app correto quando `app_type='ads'`.

2. Separar de forma rígida Seller e Ads no backend
- Em `shopee-sync`, buscar explicitamente o token `seller`.
- Em `shopee-ads`, exigir explicitamente o token `ads`, sem fallback para “qualquer token”.
- Isso evita usar o token errado e elimina estados falsos de conexão.

3. Corrigir a lógica do frontend para não misturar tokens
- Revisar usos de `useShopeeToken()` sem `appType` e trocar por `useShopeeToken('seller')`, `useShopeeToken('ads')` ou `useShopeeTokenStatus()`.
- Assim cada tela passa a refletir o status real da API correta.

4. Deixar a página de Integrações clara sobre qual conta está conectada
- Parar de mostrar `currentStore.name` como se fosse a loja Shopee conectada.
- Exibir a identidade real da conexão: pelo menos `shop_id`, e idealmente também `shop_name`.
- Se Seller e Ads estiverem ligados a lojas diferentes, mostrar alerta visual de “contas diferentes”.

5. Persistir metadados reais da conta Shopee
- Salvar `shop_name` (e opcionalmente região/status) na conexão durante callback ou sincronização.
- Usar esses dados nos cards para o usuário ver exatamente qual conta foi autorizada.

6. Ajustar feedback do fluxo
- Unificar erros e redirects para `/configuracoes/integracoes`.
- Remover o fallback hardcoded do domínio antigo no callback.
- Mostrar mensagens mais específicas quando Ads não estiver conectado de verdade.

Detalhes técnicos

- Arquivos principais:
  - `supabase/functions/_shared/shopee.ts`
  - `supabase/functions/shopee-auth/index.ts`
  - `supabase/functions/shopee-callback/index.ts`
  - `supabase/functions/shopee-sync/index.ts`
  - `supabase/functions/shopee-ads/index.ts`
  - `src/hooks/useShopeeToken.ts`
  - `src/pages/Integracoes.tsx`
- Possível ajuste de dados:
  - adicionar/persistir `shop_name` na estrutura da conexão para a UI não depender da loja interna do app.

Resultado esperado

- O botão de Ads passa a abrir o OAuth do app correto.
- Seller e Ads continuam separados no backend, mas claros no UI.
- A página mostra a conta Shopee real conectada, sem confundir com a loja interna.
- Se houver mismatch entre Seller e Ads, isso aparece imediatamente para o usuário.
