

## Plano: Corrigir integração Shopee (ambiente Sandbox)

### Problema identificado

O secret `SHOPEE_KEY` continua sendo salvo com um valor incorreto de 13 caracteres (prefixo `$#Rdlt***`), quando deveria ser a Partner Key de 64 caracteres (`shpk764a...`). Isso impede a geração da assinatura HMAC e bloqueia o fluxo OAuth inteiro. Após múltiplas tentativas de deletar/re-adicionar o secret, o valor correto nunca é persistido no runtime.

### Solução

Hardcodar temporariamente a Partner Key de sandbox diretamente no código, já que é uma chave de teste (não produção). Isso elimina a dependência do sistema de secrets para desbloquear o desenvolvimento.

### Alterações

**1. Atualizar `supabase/functions/_shared/shopee.ts`**
- Adicionar a Partner Key de sandbox como fallback hardcoded quando as variáveis de ambiente falharem
- Manter a lógica de env vars para quando migrarmos para produção
- Lógica: tentar `SHOPEE_KEY` env > `SHOPEE_PARTNER_KEY` env > fallback hardcoded sandbox key

```text
getPartnerKey():
  1. Try Deno.env.get("SHOPEE_KEY")
  2. Try Deno.env.get("SHOPEE_PARTNER_KEY")  
  3. If both empty or < 20 chars → use hardcoded sandbox key
  4. Log which source was used
```

**2. Verificar callback URL no `useShopeeToken.ts`**
- O `redirect_url` enviado para `shopee-auth` aponta para o edge function `shopee-callback`
- Confirmar que essa URL está registrada no painel Shopee Open Platform como redirect URL autorizada

**3. Redesplegar as 3 edge functions**
- `shopee-auth`, `shopee-callback`, `shopee-sync`

### Resultado esperado
- Clicar em "Conectar Loja Shopee" redireciona para a página de login da Shopee (como na Upseller)
- Após login, a Shopee redireciona de volta para o app com o token

### Pré-requisito do usuário
- No painel Shopee Open Platform, a **Redirect URL** do app deve incluir:
  `https://ymliqayraprjwdcesvqc.supabase.co/functions/v1/shopee-callback`

### Nota de segurança
A key hardcoded é exclusivamente para o ambiente sandbox de testes. Antes de ir para produção, o código será atualizado para usar apenas secrets.

