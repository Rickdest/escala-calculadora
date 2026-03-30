

## Plano: Corrigir integração Shopee (HMAC + Redirect URL)

### Problemas identificados

1. **Partner Key incorreta**: A key hardcoded (`shpk764a...`) pode não ser a sua chave real do sandbox. Você precisa revelar a chave no painel da Shopee (clicando no olhinho) e confirmar se é a mesma.

2. **Redirect URL não bate**: O código gera `https://ymliqayraprjwdcesvqc.supabase.co/functions/v1/shopee-callback`, mas na Shopee o domínio cadastrado é `https://app.richardaragao.com.br`. A Shopee rejeita quando não batem.

### Ações necessárias

**Ação 1 — Você (no painel da Shopee):**
- Clique no olhinho ao lado de "Chave de parceiro da API de teste" e revele a chave completa
- Se for diferente de `shpk764a7272526b4d7a5664794d744a57494d485650664e5a6778635968514d`, me envie a chave correta para atualizar no código
- Altere o "Domínio de URL de redirecionamento de teste" para: `https://ymliqayraprjwdcesvqc.supabase.co`

**Ação 2 — Eu (no código):**
- Atualizar o `SANDBOX_PARTNER_KEY` no `_shared/shopee.ts` se a chave for diferente
- Atualizar o secret `SHOPEE_KEY` com o valor correto
- Redesplegar as edge functions

### Por que o Lovable Cloud funciona aqui

O outro Claude mencionou que "o Lovable não gerencia secrets" — isso não é correto. Eu consigo gerenciar os secrets das Edge Functions diretamente. O que preciso é o **valor correto** da sua Partner Key do sandbox.

### Próximo passo

Me envie:
1. A Partner Key revelada do sandbox (clique no olhinho na Shopee)
2. Confirmação de que alterou o redirect URL na Shopee para `https://ymliqayraprjwdcesvqc.supabase.co`

