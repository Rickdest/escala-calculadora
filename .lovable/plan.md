

## Integração Shopee API — Plano completo

### Visão geral
Criar o fluxo OAuth 2.0 com a Shopee usando Edge Functions, restrito a admins. O CSV continua funcionando em paralelo.

### Credenciais (serão armazenadas como secrets no backend)
- **Partner ID**: `1231044`
- **Partner Key**: `shpk764a7272526b4d7a5664794d744a57494d485650664e5a6778635968514d`

### 1. Armazenar secrets
- Adicionar `SHOPEE_PARTNER_ID` e `SHOPEE_PARTNER_KEY` como secrets do backend via ferramenta `add_secret`

### 2. Criar tabela `shopee_tokens`
```sql
CREATE TABLE public.shopee_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id bigint NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expire_in integer NOT NULL,
  token_created_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_id)
);
ALTER TABLE public.shopee_tokens ENABLE ROW LEVEL SECURITY;
-- Apenas admins podem ler/escrever (fase de teste)
CREATE POLICY "Admins manage shopee tokens" ON public.shopee_tokens
  FOR ALL TO authenticated USING (public.has_role('admin')) WITH CHECK (public.has_role('admin'));
```

### 3. Edge Function: `shopee-auth` (gerar URL de autorização)
- Recebe requisição autenticada, valida que é admin
- Gera a URL de auth da Shopee: `https://partner.shopeemobile.com/api/v2/shop/auth_partner`
- Parâmetros: `partner_id`, `redirect` (callback URL), `timestamp`, `sign` (HMAC-SHA256)
- Retorna a URL para o frontend redirecionar

### 4. Edge Function: `shopee-callback` (troca code por tokens)
- Recebe `code` e `shop_id` da Shopee após autorização
- Chama `https://partner.shopeemobile.com/api/v2/auth/token/get` com assinatura HMAC
- Salva `access_token`, `refresh_token`, `shop_id` na tabela `shopee_tokens`
- Redireciona de volta ao app com sucesso

### 5. Edge Function: `shopee-sync` (buscar dados de ads)
- Valida admin + token ativo
- Chama endpoints da Shopee Ads API (ex: `https://partner.shopeemobile.com/api/v2/ads/get_all_ads`)
- Mapeia dados para o formato de `ads_data`
- Insere/atualiza na tabela `ads_data` (mesmo formato do CSV)

### 6. Atualizar o frontend (admin-only)
- **`ShopeeIntegrationModal.tsx`**: Para admins, mostrar botão "Conectar Loja" que inicia o OAuth. Para não-admins, manter o estado "Em análise"
- **`AdsTab.tsx`**: Se admin tem token Shopee salvo, mostrar botão "Sincronizar" ao lado de "Atualizar CSV"
- Usar `useAdmin()` hook para controlar visibilidade

### Resultado
- Admin pode conectar loja Shopee via OAuth e sincronizar dados de ads automaticamente
- Usuários normais continuam vendo "Em análise" e usando CSV
- Quando a integração sair de teste, basta trocar a policy de admin-only para todos os autenticados

