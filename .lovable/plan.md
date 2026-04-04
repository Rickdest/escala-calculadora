

## Plano: Separação rigorosa Seller vs Ads na integração Shopee

### Implementado

1. **`_shared/shopee.ts`**: `getAdsCredentials()` não faz mais fallback para credenciais Seller — lança erro claro se SHOPEE_ADS_PARTNER_ID ou SHOPEE_ADS_KEY não estão configurados. Adicionada validação cruzada: Partner ID de Ads não pode ser igual ao de Seller.

2. **`shopee-sync`**: Busca explicitamente `app_type = 'seller'` no token.

3. **`shopee-ads`**: Busca exclusivamente `app_type = 'ads'`, sem fallback. Retorna erro 403 claro se não existe token Ads.

4. **`shopee-callback`**: Todos os erros redirecionam para `/configuracoes/integracoes` com `app_type` e `shopee_error` na URL. Credenciais validadas com try/catch.

5. **`shopee-auth`**: Validação de credenciais com try/catch e mensagem clara de erro de configuração.

6. **`shopee-seller-discovery`**: Removido fallback para "qualquer token" — usa apenas token seller.

7. **`Integracoes.tsx`**:
   - Exibe `shop_id` real em vez de `currentStore.name`
   - Alerta visual quando Seller e Ads estão conectados a lojas diferentes
   - Mensagens de erro específicas por código de erro
   - Aviso quando há histórico de Ads mas sem token ativo
   - Removida dependência de `useStore`

8. **`AdsTab.tsx`**: `AdsHeader` e componente principal usam `useShopeeToken('ads')` em vez de genérico.

9. **`ShopeeIntegrationModal.tsx`**: Usa `useShopeeTokenStatus()` para status separado de Seller e Ads.
