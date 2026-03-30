
Objetivo

Fazer a integração abrir a autenticação da Shopee de fato. Hoje o front já tenta redirecionar para a Shopee, mas a Shopee rejeita a URL antes do login porque a assinatura HMAC está inválida.

Diagnóstico confirmado

- O botão já segue o fluxo esperado “estilo Upseller”: `startOAuth()` chama o backend e faz `window.location.href = auth_url`.
- Portanto, o problema não é faltar redirecionamento para o site da Shopee; o redirecionamento está sendo bloqueado pela própria Shopee.
- A função `shopee-auth` já está usando:
  - host de sandbox
  - `partner_id=1231044`
  - path `/api/v2/shop/auth_partner`
- O erro atual mudou de `partner_id invalid` para `error_sign / Wrong sign`, então o bloqueio agora está na assinatura.
- Os logs mostram `SHOPEE_PARTNER_KEY` com `keyLength: 13`, o que é um forte indício de key errada, incompleta, ou salva em formato incorreto.
- `shopee-auth` já usa `.trim()`, mas `shopee-callback` e `shopee-sync` ainda não padronizam isso; mesmo corrigindo o login, o restante do fluxo pode quebrar depois.

Plano de correção

1. Centralizar a lógica Shopee
- Criar um helper compartilhado para:
  - ler `partner_id` e `partner_key`
  - aplicar `trim()`
  - validar vazio/formato
  - gerar assinatura HMAC de forma única
- Remover a duplicação entre `shopee-auth`, `shopee-callback` e `shopee-sync`.

2. Endurecer validação e diagnóstico
- Fazer o backend devolver erro claro quando a key estiver inválida ou suspeita.
- Padronizar logs seguros com:
  - endpoint
  - base string
  - tamanho da key
  - prefixo mascarado
- Evitar continuar o fluxo com credencial ruim.

3. Melhorar a UX do erro
- Em `useShopeeToken` e no modal, exibir a mensagem real do backend em vez de toast genérico.
- Em `Roas.tsx`, tratar estados distintos como:
  - `wrong_sign`
  - `token_failed`
  - `no_admin`
  - `unknown`
- Isso vai deixar claro se o problema é credencial, callback ou permissão.

4. Fechar o fluxo OAuth completo
- Confirmar o `redirect_url` do callback.
- Padronizar `.trim()`/validação também na troca e refresh de token.
- Garantir que, após autorização, o callback grave o token e volte para `/roas?shopee_connected=true`.

5. Validar ponta a ponta
- Testar `shopee-auth` até a URL abrir a tela de login/autorização da Shopee.
- Validar o callback após a autorização.
- Testar a sincronização de ads depois da conexão.

Dependência externa provável

- Se, após a padronização do código, o erro continuar, a causa mais provável continuará sendo o valor salvo em `SHOPEE_PARTNER_KEY`.
- Pelos logs atuais, essa é a hipótese principal.
- Nesse caso, será necessário substituir a key pelo valor exato do painel da Shopee Open Platform e repetir o teste.

Arquivos a ajustar

- `supabase/functions/shopee-auth/index.ts`
- `supabase/functions/shopee-callback/index.ts`
- `supabase/functions/shopee-sync/index.ts`
- `src/hooks/useShopeeToken.ts`
- `src/pages/Roas.tsx`

Resultado esperado

- Ao clicar em “Conectar Loja Shopee”, o app abre a autenticação da Shopee em vez de mostrar `Wrong sign`.
- Após autorizar, o usuário volta para o app com a loja conectada.
- Se houver credencial inválida, o app passa a mostrar a causa correta em vez de erro genérico.
