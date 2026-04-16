

## Diagnóstico: Webhook Cakto configurado mas nunca chamado

### O que encontrei
1. A edge function `cakto-webhook` **está deployada e funcional** — retornou 400 corretamente para payload inválido de teste
2. **Zero chamadas** foram recebidas da Cakto — nunca, em nenhum momento
3. A URL no painel Cakto está correta: `https://ymliqayraprjwdcesvqc.supabase.co/functions/v1/cakto-webhook`
4. O secret `CAKTO_WEBHOOK_SECRET` existe no sistema

### Causa provável
Algumas plataformas de pagamento (incluindo a Cakto) enviam um **preflight OPTIONS** ou verificam CORS antes de enviar o webhook. O CORS atual está restrito a `https://pay.cakto.com.br`, o que pode bloquear chamadas vindas de outro domínio/servidor da Cakto. Além disso, os headers permitidos são limitados.

### Ações necessárias

**Ação manual sua (verificar no painel Cakto):**
- Confirme que o secret no painel Cakto (`f6a2ad49-5818-49f8-bb7f-7f1527483f71` na imagem) é **idêntico** ao valor salvo em `CAKTO_WEBHOOK_SECRET`. Se não for, atualize o secret no sistema.
- Verifique se o webhook está **ativo/salvo** na Cakto — algumas plataformas exigem clicar "Salvar" E "Ativar"
- Tente disparar um **webhook de teste** pelo painel Cakto, se disponível

**Mudanças no código — `supabase/functions/cakto-webhook/index.ts`:**

1. **Abrir CORS para `*`** — Webhooks server-to-server não deveriam precisar de CORS, mas abrir garante que nenhum preflight seja bloqueado:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-signature",
};
```

2. **Adicionar log no início absoluto** (antes de qualquer validação) para confirmar que chamadas chegam:
```typescript
Deno.serve(async (req) => {
  console.log(">>> cakto-webhook hit:", req.method, new Date().toISOString());
```

3. **Re-deploy** a função após as mudanças

### Arquivo modificado
- `supabase/functions/cakto-webhook/index.ts` (2 pontos: CORS headers e log inicial)

