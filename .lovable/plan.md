

## Plano: Separação rigorosa Seller vs Ads na integração Shopee

### Implementado

1. **`_shared/shopee.ts`**: `getAdsCredentials()` não faz mais fallback para credenciais Seller — lança erro claro se SHOPEE_ADS_PARTNER_ID ou SHOPEE_ADS_KEY não estão configurados.

2. **`shopee-sync`**: Busca explicitamente `app_type = 'seller'` no token.

3. **`shopee-ads`**: Busca exclusivamente `app_type = 'ads'`, sem fallback. Retorna erro 403 claro se não existe token Ads.

4. **`shopee-callback`**: Removido fallback de domínio hardcoded.

5. **`Integracoes.tsx`**:
   - Exibe `shop_id` real em vez de `currentStore.name`
   - Alerta visual quando Seller e Ads estão conectados a lojas diferentes
   - Mensagens de erro específicas por código de erro
   - Removida dependência de `useStore`
