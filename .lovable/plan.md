
## Plano: corrigir erro ao logar

### Diagnóstico
O login em si está funcionando, mas o app quebra logo depois ao validar a assinatura.

Evidências da análise:
- Os logs de autenticação mostram `POST /token` com `status 200` e evento `Login`
- Os logs da função `check-subscription` mostram sucesso: `Found by user_id: active monthly`
- Porém, no navegador, as chamadas para `POST .../functions/v1/check-subscription` falham com `Failed to fetch`
- A origem real do preview é `https://663ad348-e18a-4674-a7c5-186feeae7832.lovableproject.com`
- O CORS atual da função só aceita:
  - `ALLOWED_ORIGIN`
  - domínios `*.lovable.app`
  - `localhost`

Ou seja: a função responde no servidor, mas o navegador bloqueia a resposta por CORS porque `*.lovableproject.com` não está liberado.

### O que corrigir
#### 1. Ajustar CORS em `supabase/functions/check-subscription/index.ts`
Atualizar a lógica de `getCorsHeaders(req)` para aceitar também previews em:
- `*.lovableproject.com`

Manter o restante:
- `ALLOWED_ORIGIN`
- `*.lovable.app`
- `localhost`

#### 2. Garantir fallback seguro
Revisar o retorno de `Access-Control-Allow-Origin` para nunca devolver origem vazia quando o origin não bater com a allowlist.

#### 3. Não mexer no fluxo de login
Não faz sentido alterar:
- `AuthContext`
- `Auth.tsx`
- `billing.service.ts`

Esses arquivos não são a causa principal do erro atual.

### Arquivo a modificar
- `supabase/functions/check-subscription/index.ts`

### Resultado esperado
Após a correção:
- o usuário consegue logar normalmente
- a validação da assinatura deixa de cair em `Failed to fetch`
- a tela “Erro ao verificar sua assinatura” para de aparecer no preview

### Observações
- O warning de React sobre `ref` em `ProtectedRoute` apareceu no console, mas é secundário e não é o motivo do bloqueio no login.
- A função backend está saudável; o problema é especificamente de CORS no ambiente de preview.

### Validação após implementar
1. Fazer login no preview
2. Confirmar que a chamada `check-subscription` retorna sem `Failed to fetch`
3. Verificar se o usuário entra na Home em vez da tela de erro
4. Testar também no domínio publicado para garantir que nada regrediu
