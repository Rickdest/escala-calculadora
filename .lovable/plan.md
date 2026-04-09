
Problema confirmado: o backend de assinatura não está fora do ar. Os logs mostram chamadas `check-subscription` retornando `200`, mas a autenticação está falhando na restauração da sessão com `Invalid Refresh Token: Refresh Token Not Found`. Hoje o app trata um usuário em cache como “logado” cedo demais, enquanto a sessão ainda está quebrada/indefinida. Além disso, o `StoreProvider` já dispara consultas só com `user`, sem esperar a autenticação ficar realmente pronta. Essa combinação explica o comportamento de loading infinito / tela travada em contas diferentes.

Plano de correção

1. Blindar a inicialização da autenticação
- Ajustar `src/contexts/AuthContext.tsx` para tratar erro e timeout de `getSession()`.
- Se a restauração da sessão falhar (refresh token inválido / erro de fetch), limpar a sessão local e finalizar `loading` em vez de deixar a aplicação presa.
- Considerar sessão válida apenas quando existir sessão real com token, não apenas `user` em memória.

2. Criar uma regra de “auth pronta” para o app
- Expor no `AuthContext` um estado confiável de sessão inicial resolvida.
- Fazer os providers e queries só rodarem depois disso.

3. Parar queries protegidas antes da auth estar pronta
- Em `src/contexts/StoreContext.tsx`, trocar `enabled: !!user` por algo como `enabled: authReady && !!user`.
- Isso evita consultas em tabelas protegidas antes da sessão estar estabelecida, eliminando a race condition de autenticação.

4. Corrigir os guards de rota
- Em `src/App.tsx`, `AuthRoute` deve redirecionar para `/` apenas com sessão válida, não só com `user`.
- `ProtectedRoute` deve mandar para `/auth` quando não houver sessão utilizável, em vez de ficar preso em loading.
- Manter a tela de erro de assinatura, mas tornar o “Sair da conta” um logout local/forçado para recuperar sessão corrompida.

5. Tornar a recuperação de erro mais robusta
- Em `src/contexts/SubscriptionContext.tsx`, quando houver usuário sem token válido ou falha de autenticação, encerrar o estado de loading corretamente.
- Evitar que erro técnico de sessão se transforme em spinner eterno.

Arquivos a ajustar
- `src/contexts/AuthContext.tsx`
- `src/contexts/StoreContext.tsx`
- `src/App.tsx`
- `src/contexts/SubscriptionContext.tsx`

Validação após a correção
- Abrir `/auth` sem ficar carregando infinitamente.
- Testar login com conta válida.
- Testar conta sem compra indo para paywall.
- Testar conta com assinatura ativa abrindo o app normalmente.
- Testar botão “Sair da conta” em sessão corrompida.
- Confirmar comportamento no desktop e no celular.

Detalhes técnicos
- Evidência principal: logs de auth com `refresh_token_not_found`.
- Evidência secundária: logs da função `check-subscription` com `200`, então o gargalo não está no webhook nem na checagem da assinatura.
- Não parece ser problema de build; o problema está no fluxo de restauração de sessão + consultas disparadas cedo demais.
- Não deve exigir mudança no banco; a correção é de fluxo no frontend/auth.
