
## Corrigir erro `partner_id invalid` na integração Shopee

### Diagnóstico
O problema não está no front. A evidência já mostra isso:
- a função `shopee-auth` está respondendo com `auth_url` contendo `partner_id=NaN`
- isso acontece antes do redirecionamento para a Shopee
- nos arquivos atuais, as 3 funções fazem `Number(Deno.env.get("SHOPEE_PARTNER_ID")!)`

Conclusão: o secret `SHOPEE_PARTNER_ID` está chegando em formato inválido para `Number(...)` (ex.: espaço, aspas, texto extra, quebra de linha), e o backend não valida isso antes de montar a URL.

### O que vou corrigir
1. Criar uma validação única e rígida do `SHOPEE_PARTNER_ID`
- Ler o secret com `trim()`
- Validar se contém apenas dígitos
- Converter com segurança
- Verificar faixa válida `0` a `4294967295`
- Se estiver inválido, retornar erro claro no backend em vez de seguir com `NaN`

2. Aplicar essa validação nas 3 funções
- `supabase/functions/shopee-auth/index.ts`
- `supabase/functions/shopee-callback/index.ts`
- `supabase/functions/shopee-sync/index.ts`

3. Melhorar mensagens de erro
- Em vez de deixar a Shopee responder `partner_id invalid`, o backend vai responder algo como:
  - `Invalid SHOPEE_PARTNER_ID secret configuration`
- Isso evita erro silencioso e acelera debugging futuro

4. Revisar a composição da URL e payload
- Garantir que `partner_id` vá sempre numérico na query e no body
- Manter o host de sandbox, já que suas credenciais são de teste:
  - `https://partner.test-stable.shopeemobile.com`

5. Corrigir a configuração do secret
Além do código, será necessário regravar o secret `SHOPEE_PARTNER_ID` exatamente como:
```text
1231044
```
Sem aspas, sem espaços, sem quebra de linha extra.

### Verificação que farei depois da implementação
1. Testar `shopee-auth`
- confirmar que a resposta retorna `auth_url` com `partner_id=1231044`
- confirmar que não aparece mais `NaN`

2. Testar o fluxo completo
- clicar em “Integrar”
- validar que o redirecionamento abre a Shopee sem o erro de partner_id

3. Validar regressão
- confirmar que o fluxo CSV continua funcionando em paralelo
- confirmar que a integração continua restrita ao admin

### Resultado esperado
- o erro atual desaparece
- a URL de autorização passa a sair correta
- se o secret voltar a ser salvo errado no futuro, o sistema acusa isso claramente em vez de gerar `NaN`

### Observação importante
Pelo estado atual, o primeiro ajuste mais provável e necessário é:
- regravar o secret `SHOPEE_PARTNER_ID` com valor limpo
- junto com isso, endurecer a validação no código para impedir nova quebra pelo mesmo motivo
