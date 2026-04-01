

## Plano: Corrigir erro "Wrong sign" na troca de token da Shopee

### Diagnóstico

Os logs mostram:
- OAuth redirect: OK (code e shop_id recebidos)
- State/user_id: OK (resolvido corretamente)
- Token exchange: **403 - Wrong sign**

A assinatura é gerada em `generateSign()` no arquivo `_shared/shopee.ts`. O base string atual para token/get é:
```
partner_id + path + timestamp + shop_id
```

Isso está correto conforme a documentação da Shopee. Portanto, o problema mais provável é que o valor do secret `SHOPEE_KEY` não corresponde ao `SHOPEE_PARTNER_ID` de produção.

### Etapas

**1. Adicionar log de debug do base string e da chave**

No `_shared/shopee.ts`, dentro de `generateSign()`, logar:
- O `baseString` completo usado para assinar
- O comprimento e os primeiros 4 caracteres da `partnerKey`
- O `PARTNER_ID` usado

Isso permite que você compare exatamente o que está sendo assinado com o que a Shopee espera.

**2. Verificar/reatualizar o secret SHOPEE_KEY**

Se os logs confirmarem que a chave está errada ou truncada, será necessário atualizar o secret com o valor correto do painel de produção da Shopee.

### Arquivos envolvidos

- `supabase/functions/_shared/shopee.ts` — adicionar logs na função `generateSign`

### O que você precisa fazer depois

Após o deploy, testar o fluxo OAuth novamente e me enviar os novos logs. Com o base string visível, poderemos confirmar se:
1. A chave está correta (comprimento e prefixo)
2. O partner_id no base string bate com o do console da Shopee
3. O formato do base string está correto

