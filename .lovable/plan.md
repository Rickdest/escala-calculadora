
Plano: trocar o OAuth da Shopee para um callback no domínio público da app

Problema confirmado
- Hoje o frontend monta o `redirect` da Shopee com `VITE_SUPABASE_URL/functions/v1/shopee-callback` em `src/hooks/useShopeeToken.ts`.
- A Shopee valida esse domínio antes de autorizar. O erro acontece antes mesmo do callback rodar.
- O `APP_URL` atual só é usado depois, no redirecionamento final do backend, então ele não resolve a rejeição inicial.

O que vou implementar
1. Parar de usar o domínio do backend como `redirect`
- Em `supabase/functions/shopee-auth/index.ts`, o backend passa a montar o redirect sozinho a partir de `APP_URL`.
- O redirect enviado para a Shopee passa a ser algo como:
  `https://app.richardaragao.com.br/shopee-callback`
- O frontend deixa de enviar `redirect_url` manual.

2. Criar uma rota pública de callback na app
- Adicionar uma página/rota React como `/shopee-callback`.
- Essa tela só mostra “finalizando conexão...” e repassa os query params para a edge function já existente:
  `.../functions/v1/shopee-callback?code=...&shop_id=...&state=...`
- Essa rota fica fora do `ProtectedRoute`, para não ser bloqueada por auth/subscription no retorno da Shopee.

3. Manter o processamento seguro no backend
- Reaproveitar `supabase/functions/shopee-callback/index.ts` para:
  - validar `state`
  - localizar `user_id`
  - trocar o código por token
  - salvar em `shopee_tokens`
  - redirecionar para `APP_URL/roas?shopee_connected=true` ou `shopee_error=...`

4. Ajustar quem inicia o OAuth
- Em `src/hooks/useShopeeToken.ts`, `startOAuth()` passa a chamar `shopee-auth` sem montar callback com `VITE_SUPABASE_URL`.
- Assim o fluxo usa sempre o domínio oficial, em vez de depender de preview ou da URL do backend.

5. Alinhar a configuração da Shopee
- No console da Shopee, o domínio autorizado deve ser o mesmo de `APP_URL`.
- Se pedir domínio: `https://app.richardaragao.com.br`
- Se pedir URL completa: `https://app.richardaragao.com.br/shopee-callback`
- Depois dessa mudança, não faz mais sentido usar `*.supabase.co` como domínio oficial do OAuth.

Arquivos envolvidos
- `src/hooks/useShopeeToken.ts`
- `src/App.tsx`
- nova página em `src/pages/...`
- `supabase/functions/shopee-auth/index.ts`
- `supabase/functions/shopee-callback/index.ts`

Detalhes técnicos
- A correção principal é arquitetural: a Shopee precisa validar um domínio público estável, então o primeiro callback deve cair na própria app.
- `APP_URL` vira a fonte única do domínio de OAuth.
- O `state` atual continua sendo o vínculo seguro entre o retorno da Shopee e o usuário correto.
- Não preciso mexer no fluxo de gravação do token; só no ponto de entrada do callback.

Validação depois da implementação
- Clicar em “Conectar Loja Shopee”
- Conferir que a URL de autorização usa o domínio público da app
- Autorizar a loja
- Verificar retorno em `/shopee-callback`
- Confirmar gravação em `shopee_tokens`
- Confirmar toast de sucesso em `/roas`
