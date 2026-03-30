
Objetivo: fazer uma correção mais profunda no fluxo Shopee porque o problema atual não está mais nos secrets, e sim no formato da assinatura e na robustez do fluxo OAuth.

1. Corrigir a assinatura do endpoint de autorização
- Ajustar `supabase/functions/_shared/shopee.ts` para tratar `auth_partner` como caso especial.
- Hoje a função assina tudo como:
```text
partner_id + path + timestamp [+ access_token + shop_id]
```
- Pela verificação avançada, o endpoint `/api/v2/shop/auth_partner` no sandbox deve usar:
```text
partner_id + timestamp
```
- Vou separar a lógica em helpers explícitos, por exemplo:
```text
signAuthPartner(timestamp)
signApiRequest(path, timestamp, accessToken?, shopId?)
```
- Depois atualizar `shopee-auth/index.ts` para usar a assinatura específica de auth.

2. Passar a usar configuração por secrets, com fallback controlado
- Ler `SHOPEE_PARTNER_ID` de secret antes do hardcoded.
- Manter fallback sandbox apenas para não quebrar teste.
- Adicionar logs mais úteis e seguros:
  - fonte do partner_id
  - fonte da key
  - tipo de assinatura usada (`auth_partner` vs `api_request`)
  - nunca logar key completa

3. Fortalecer o callback e diagnóstico
- Melhorar `supabase/functions/shopee-callback/index.ts` para capturar e redirecionar com códigos de erro mais específicos:
  - `missing_params`
  - `token_failed`
  - `token_exchange_http_error`
  - `token_upsert_failed`
- Logar também:
  - status HTTP da troca de token
  - corpo retornado pela Shopee
  - shop_id recebido
- Isso vai permitir identificar se, após corrigir o sign da autorização, existe um segundo problema na troca do token.

4. Ajustar o cliente para depuração melhor
- Em `src/hooks/useShopeeToken.ts`, manter o callback atual do backend, mas preparar melhor tratamento de erro se `auth_url` vier inválida ou vazia.
- Em `src/pages/Roas.tsx`, ampliar o mapa de mensagens para os novos códigos de erro do callback, para o usuário ver o motivo real e não apenas “erro desconhecido”.

5. Corrigir avisos de UI que estão poluindo o debug
- Em `src/components/ui/badge.tsx`, converter `Badge` para `React.forwardRef`, porque o console mostra warning de ref em `ShopeeIntegrationModal`.
- Em `src/components/roas/ShopeeIntegrationModal.tsx`, adicionar descrição acessível ao `DialogContent` para eliminar o warning de `aria-describedby`.
- Isso não resolve o OAuth, mas limpa o console para deixar o diagnóstico mais confiável.

6. Validar o fluxo esperado após a implementação
- Verificar este comportamento ponta a ponta:
```text
Clique em "Conectar Loja Shopee"
→ shopee-auth retorna auth_url válida
→ Shopee abre tela de login/autorização sem error_sign
→ Shopee redireciona para /functions/v1/shopee-callback
→ callback grava em shopee_tokens
→ app volta para /roas?shopee_connected=true
→ modal passa a mostrar "Conectada"
```

Detalhes técnicos
- Evidências já encontradas:
  - `shopee-auth` responde 200 e gera URL normalmente
  - `shopee-callback` não recebeu chamadas
  - tabela `shopee_tokens` continua vazia
  - logs mostram `auth_partner` sendo assinado com base string de tamanho 42, isto é, incluindo `path`
- Conclusão:
  - o erro persistente está antes do callback
  - o ajuste prioritário é corrigir a assinatura do endpoint de autorização

Arquivos envolvidos
- `supabase/functions/_shared/shopee.ts`
- `supabase/functions/shopee-auth/index.ts`
- `supabase/functions/shopee-callback/index.ts`
- `src/hooks/useShopeeToken.ts`
- `src/pages/Roas.tsx`
- `src/components/ui/badge.tsx`
- `src/components/roas/ShopeeIntegrationModal.tsx`
