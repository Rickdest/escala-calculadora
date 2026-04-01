

## Plano: Migrar Integração Shopee para Produção

### O que muda

A API foi aprovada. Precisamos: atualizar credenciais, apontar para o host de produção, e liberar para todos os usuários (não só admin).

### Etapas

**1. Atualizar secrets no backend**

Você precisará fornecer os novos valores para 3 secrets:
- `SHOPEE_PARTNER_ID` → novo Partner ID de produção
- `SHOPEE_KEY` → nova Partner Key de produção  
- `SHOPEE_ENV` → setar como `production` (muda o host de sandbox para `partner.shopeemobile.com`)

**2. Remover fallback de sandbox no código**

No arquivo `supabase/functions/_shared/shopee.ts`:
- Remover o fallback hardcoded `1231044` do Partner ID — se o secret não estiver configurado, lançar erro ao invés de usar valor de teste
- Reduzir logs de debug (não logar prefixos de chave em produção)

**3. Liberar para todos os usuários**

Atualmente `shopee-auth` e `shopee-sync` verificam `has_role('admin')` e bloqueiam usuários normais. Mudanças:

- **`shopee-auth/index.ts`**: Remover check de admin. Qualquer usuário autenticado pode iniciar OAuth
- **`shopee-sync/index.ts`**: Remover check de admin. Qualquer usuário autenticado pode sincronizar seus próprios dados
- **`shopee-callback/index.ts`**: Ao salvar o token, vincular ao usuário que iniciou o OAuth (não mais buscar admin). Passar `user_id` via state parameter no fluxo OAuth
- **`ShopeeIntegrationModal.tsx`**: Remover a lógica condicional `isAdmin` — todos veem o botão "Conectar Loja Shopee"

**4. Fluxo OAuth — identificar o usuário no callback**

Problema: o callback da Shopee não sabe qual usuário iniciou o fluxo. Solução:
- No `shopee-auth`, gerar um `state` token (UUID) e salvá-lo temporariamente no banco vinculado ao `user_id`
- Passar esse `state` como parâmetro na URL de redirect da Shopee
- No `shopee-callback`, recuperar o `user_id` a partir do `state` recebido

Isso requer uma tabela auxiliar simples `shopee_auth_states` (id, user_id, state, created_at) com TTL.

**5. Atualizar UI**

- `ShopeeIntegrationModal.tsx`: Remover branch `isAdmin` / "Em análise". Todos os usuários veem a mesma interface de conexão
- Badge muda de "Em análise" para "Disponível" ou desaparece

### Detalhes técnicos

- Migration SQL: criar tabela `shopee_auth_states` com RLS (insert/select own, auto-cleanup via função)
- Edge functions editadas: `_shared/shopee.ts`, `shopee-auth`, `shopee-callback`, `shopee-sync`
- Frontend editado: `ShopeeIntegrationModal.tsx`, `useShopeeToken.ts`
- Secrets atualizados via ferramenta `add_secret`: `SHOPEE_PARTNER_ID`, `SHOPEE_KEY`, `SHOPEE_ENV`

