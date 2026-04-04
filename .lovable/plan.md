
Resumo do diagnóstico

- Não, o erro atual não acontece porque o sistema está pedindo Seller + Ads ao mesmo tempo.
- A evidência é a chamada observada para `shopee-auth` com body `{"app_type":"seller"}` e o log:
  - `[SHOPEE AUTH] Generated auth URL for app_type=seller, partner_id=2032348`
- O `auth_url` retornado já está com:
  - `partner_id=2032348`
  - `redirect=https://app.skalify.com.br/shopee-callback?...`
- Como não há logs do `shopee-callback`, a falha acontece antes do callback, já na abertura da URL da Shopee.
- O erro `{"error":"error_sign","message":"Wrong sign"}` nesse ponto aponta para assinatura inválida do app Seller:
  - `SHOPEE_KEY` não corresponde ao Partner ID `2032348`, ou
  - a key não pertence ao ambiente `production`.

Plano

1. Corrigir a credencial do app Seller
- Atualizar o secret `SHOPEE_KEY` para a partner key correta do app Seller `2032348`.
- Confirmar que `SHOPEE_ENV=production` continua alinhado com essa mesma aplicação.
- Não tratar Ads como causa primária agora, porque o primeiro clique atual ainda nem chega nessa etapa.

2. Blindar o backend para esse tipo de erro
- Arquivos:
  - `supabase/functions/_shared/shopee.ts`
  - `supabase/functions/shopee-auth/index.ts`
- Tornar mais explícita a separação Seller vs Ads nas credenciais.
- Adicionar logs seguros de diagnóstico: `app_type`, `partner_id`, host e fingerprint curta da key, sem expor segredo.
- Retornar erro estruturado quando houver falha de assinatura, para evitar jogar o usuário direto na resposta JSON crua da Shopee.

3. Melhorar o feedback na interface
- Arquivos:
  - `src/hooks/useShopeeToken.ts`
  - `src/pages/Integracoes.tsx`
- Traduzir `error_sign` como algo claro, por exemplo:
  - “A chave da Shopee Seller está inválida ou não corresponde ao app configurado.”
- Limpar o estado pendente do fluxo encadeado quando o Seller falhar, para não deixar Ads marcado como próximo passo sem necessidade.

4. Validar o fluxo corretamente
- Teste 1: conta sem integração → clicar em “Conectar com Shopee” deve abrir apenas o Seller com `partner_id=2032348`.
- Teste 2: somente após o Seller autorizar com sucesso, iniciar Ads.
- Se Seller passar e Ads falhar depois, aí o próximo ajuste será no `SHOPEE_ADS_KEY`, não no Seller.

Detalhes técnicos

- A lógica de assinatura no código está coerente para os endpoints de auth:
  - `/api/v2/shop/auth_partner` → `partner_id + path + timestamp`
  - `/api/v2/auth/token/get` → `partner_id + path + timestamp`
- O frontend não altera a URL assinada; ele apenas recebe `auth_url` e faz `window.location.href = auth_url`.
- Isso reduz muito a causa provável para configuração de segredo, não para bug de frontend.
- O problema atual é do Seller, não do Ads, porque a tentativa observada foi `app_type=seller`.

Arquivos envolvidos
- `supabase/functions/_shared/shopee.ts`
- `supabase/functions/shopee-auth/index.ts`
- `src/hooks/useShopeeToken.ts`
- `src/pages/Integracoes.tsx`

Sem migration de banco.
