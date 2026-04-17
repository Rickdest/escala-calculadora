

## Diagnóstico: 422 weak_password (HIBP)

Reproduzi o erro chamando `/auth/v1/signup` direto:
- Senha `123456` → `422 weak_password / pwned`
- Senha `password123` → `422 weak_password / pwned`
- Senha forte → `200 OK` (signup funciona)

O Supabase está com **Leaked Password Protection (HIBP)** ativo, rejeitando qualquer senha que já apareceu em vazamentos. A mensagem volta em inglês: *"Password is known to be weak and easy to guess"*.

A função `traduzirErro` em `src/pages/Auth.tsx` **não trata** esse erro nem `error_code: weak_password`, então cai no fallback genérico "Erro ao processar. Tente novamente." — e o usuário fica perdido, tentando a mesma senha várias vezes (vide os 10+ POSTs em sequência nos logs do `app.skalify.com.br`).

## Solução

### 1. Tratar o erro `weak_password` em `src/pages/Auth.tsx`
Adicionar na função `traduzirErro`:
```ts
if (mensagem.includes('weak') || mensagem.includes('pwned') || mensagem.includes('known to be weak'))
  return 'Esta senha é muito comum e foi vazada em outros sites. Use uma senha única com letras, números e símbolos.';
```

### 2. Melhorar UX do campo de senha (signup)
- Trocar placeholder de "mínimo 8 caracteres" para "mín. 8 caracteres, mistura letras+números+símbolos"
- Adicionar texto auxiliar abaixo do campo no modo signup: "Evite senhas comuns como '12345678' ou 'senha123' — elas serão rejeitadas por segurança."
- Aumentar `minLength` para 8 (já está) e validar client-side antes de enviar: rejeitar se for só números, só letras, ou contiver "senha"/"password"/"123456".

### 3. Mostrar erro em toast também (signup)
Hoje só mostra o `errorMessage` no banner vermelho do topo, que some em 4s. Adicionar `toast.error(msg)` no catch do signup (igual já é feito no signIn) para garantir visibilidade.

### Arquivo modificado
- `src/pages/Auth.tsx` (3 mudanças pequenas: tradução do erro, dica de senha forte, toast no signup)

### Resumo
Não é bug do fluxo — é mensagem de erro mal traduzida. Após o fix, o usuário vai ver claramente "Esta senha é muito comum e foi vazada..." e saberá criar uma mais forte.

