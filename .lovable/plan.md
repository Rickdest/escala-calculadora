

## Diagnóstico

A tabela `shopee_tokens` tem apenas duas políticas RLS:
1. **Admins manage shopee tokens** — ALL para admins
2. **Users can view own shopee tokens** — apenas SELECT

Usuários normais **não têm permissão de DELETE** nos próprios tokens. O `supabase.from('shopee_tokens').delete()` retorna sucesso (0 rows affected) sem erro, mas não deleta nada — por isso "não acontece nada".

## Plano

### 1. Adicionar política RLS de DELETE para usuários
Criar uma migration que adicione uma política permitindo que usuários autenticados deletem seus próprios tokens:

```sql
CREATE POLICY "Users can delete own shopee tokens"
ON public.shopee_tokens
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

### 2. Verificar UI após desconexão
Após o delete funcionar, o `refetch()` já existente no código vai atualizar o estado e o card deve voltar para o estado "não conectada" automaticamente (o código já trata `neitherConnected`).

## Arquivos modificados
- Nova migration SQL (política RLS)

Nenhuma alteração de código frontend necessária — a lógica de `handleDisconnect` e `handleDisconnectAds` já está correta.

