

## Plano: Atualizar o secret SHOPEE_KEY

### Contexto
O diagnóstico confirmou que o fingerprint da `SHOPEE_KEY` no backend (`fce888b74738`) **não corresponde** à chave do console Shopee. Isso causa assinatura HMAC inválida, resultando no erro "Please login first".

### Ação
1. **Solicitar a chave correta** — Usar a ferramenta `add_secret` para pedir que você cole a **Live API Partner Key** do app Seller (2032348) do console Shopee (a que começa com `shpk6f4f6a...`). Isso atualizará o secret `SHOPEE_KEY` no backend.

2. **Verificar o deploy** — Após atualização, chamar o endpoint `shopee-auth` via curl para confirmar que o novo fingerprint corresponde à chave esperada.

### Resultado esperado
Com a chave correta, a assinatura HMAC será válida e o OAuth Seller redirecionará direto para o Seller Center (como acontece com o Ads), sem exigir login no Open Platform.

### Nenhuma alteração de código necessária
O problema é exclusivamente de configuração (secret incorreto).

