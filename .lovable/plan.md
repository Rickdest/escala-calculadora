

## Plano: Corrigir SHOPEE_PARTNER_ID no ambiente

### Causa raiz
O secret `SHOPEE_PARTNER_ID` está configurado como `2032223` (que é o Partner ID do app de **Ads**). O valor correto para o Seller é `2032348`.

Resultado: toda tentativa de OAuth abre com o app errado → Shopee rejeita por domínio inconsistente.

### Correção

**Ação única**: Atualizar o secret `SHOPEE_PARTNER_ID` para `2032348`.

Nenhuma mudança de código é necessária. Após atualizar o secret, as Edge Functions já fazem a separação correta:
- Seller: `SHOPEE_PARTNER_ID` = 2032348
- Ads: `SHOPEE_ADS_PARTNER_ID` = 2032223

O fluxo em cadeia (seller → ads) vai funcionar normalmente.

