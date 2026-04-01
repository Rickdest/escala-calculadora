

## Plano: Corrigir domínio de redirect da Shopee

### Problema

A Shopee rejeita o OAuth porque o domínio da URL de redirect (`ymliqayraprjwdcesvqc.supabase.co`) não está cadastrado no console da Shopee como "Redirect URL Domain".

### Solução

Você precisa cadastrar o domínio correto no **Console de Parceiro da Shopee**:

1. Acesse o painel de desenvolvedor da Shopee (https://open.shopee.com)
2. Vá em **App Management** → sua app → **App Settings**
3. No campo **Redirect URL** (ou "Redirect URL Domain"), adicione:
   ```
   https://ymliqayraprjwdcesvqc.supabase.co
   ```
4. Salve as alterações

### Importante

- O domínio cadastrado deve ser **exatamente** `https://ymliqayraprjwdcesvqc.supabase.co` (sem barra final, sem path)
- Se a Shopee pedir a URL completa ao invés do domínio, use: `https://ymliqayraprjwdcesvqc.supabase.co/functions/v1/shopee-callback`
- Não é necessária nenhuma alteração no código — apenas a configuração no console da Shopee

### Sem alteração de código

O código já está correto. O problema é exclusivamente de configuração no painel da Shopee.

