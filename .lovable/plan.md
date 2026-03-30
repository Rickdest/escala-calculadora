

## Diagnóstico final: SHOPEE_PARTNER_KEY incorreta

### O que os logs confirmam

O erro nos logs da Edge Function é claro e direto:

```
SHOPEE_PARTNER_KEY looks invalid (length=13). Expected 30+ chars.
```

A key salva no backend tem apenas **13 caracteres**. Uma Partner Key válida da Shopee tem tipicamente **32+ caracteres**. O código está corretamente rejeitando essa key antes de tentar assinar.

### O que NÃO precisa mudar no código

- A lógica HMAC-SHA256 está correta (usa `crypto.subtle.sign` com a base string `partnerId + path + timestamp`)
- O host de sandbox está correto (`partner.test-stable.shopeemobile.com`)
- O Partner ID está hardcoded como `1231044` ✓
- O fluxo OAuth (redirect → callback → token) está implementado corretamente
- O helper compartilhado `_shared/shopee.ts` já centraliza tudo

### Única ação necessária

1. **Deletar** o secret `SHOPEE_PARTNER_KEY` atual (valor com 13 chars)
2. **Re-adicionar** com o valor completo da Partner Key do console Shopee Open Platform
   - Acesse: Console Shopee → Detalhes do App → copie a **Partner Key** (também chamada de "Client Secret")
   - A key correta deve ter 32+ caracteres (ex: `4b6a5c7d8e9f0a1b2c3d4e5f6a7b8c9d`)

### Onde encontrar a key correta

No painel da Shopee Open Platform:
- Acesse `open.shopee.com` → faça login
- Vá em **Console** → selecione seu app
- Na seção de detalhes, copie a **Partner Key / Client Secret**
- Como está em modo desenvolvimento, use a **Test Partner Key** (não a Live Key)

### Resultado após correção

- A validação `key.length < 20` passa
- O HMAC é gerado corretamente
- A URL de autorização redireciona para a tela de login da Shopee (estilo Upseller)
- Após o vendedor autorizar, o callback salva o token e redireciona para `/roas?shopee_connected=true`

