

## Plano: Corrigir segredo do webhook Cakto

### Problema
O `CAKTO_WEBHOOK_SECRET` salvo na edge function **não corresponde** ao segredo configurado no painel da Cakto (`f6a2ad49-5818-49f8-bb7f-7f1527483f71`). Todas as requisições da Cakto estão retornando 401, e por isso nenhum pagamento foi processado automaticamente.

### Solução
Atualizar o segredo `CAKTO_WEBHOOK_SECRET` para o valor correto que aparece na Cakto: `f6a2ad49-5818-49f8-bb7f-7f1527483f71`.

### Ação
- Usar a ferramenta `update_secret` para atualizar `CAKTO_WEBHOOK_SECRET` com o valor correto.

### Nenhuma mudança de código necessária
O código da edge function está correto. O problema é exclusivamente a divergência do segredo.

### Resultado esperado
- Webhooks da Cakto passarão a ser aceitos (200 OK)
- Pagamentos futuros ativarão assinaturas automaticamente
- A tabela `subscription_events` passará a registrar eventos

