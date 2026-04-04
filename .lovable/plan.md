
## Plano: corrigir o erro da Ads e remover a confusão entre “token conectado” vs “dados já importados”

### Diagnóstico confirmado
- O problema não é só visual: o backend ainda está iniciando OAuth de **Ads** com o **Partner ID do Seller**. O log atual mostra:
  - `app_type=ads, partner_id=2032348`
- Para a conta logada `junior_rsmf@icloud.com`, hoje existe no banco:
  - **1 token seller**
  - **0 tokens ads**
- Ao mesmo tempo, essa conta ainda tem **dados históricos de Ads** salvos em `shopee_ads_by_product`.
- Resultado: o app dá a sensação de que “Ads está conectada” porque há dados/importações antigas, mas a **autorização ativa de Ads não existe** no momento.

### O que corrigir

#### 1. Travar de vez o app de Ads no backend
Ajustar a camada compartilhada para impedir qualquer configuração errada passar despercebida.

**Arquivos**
- `supabase/functions/_shared/shopee.ts`
- `supabase/functions/shopee-auth/index.ts`
- `supabase/functions/shopee-callback/index.ts`

**Mudanças**
- Validar que `SHOPEE_ADS_PARTNER_ID`:
  - existe
  - é numérico
  - **não é igual** ao `SHOPEE_PARTNER_ID` do Seller
- Se Ads estiver configurada com o mesmo Partner ID do Seller, retornar erro explícito de configuração em vez de abrir OAuth errado.
- Em `shopee-auth`, logar `app_type`, `partner_id` e um código de erro claro para misconfiguração.
- Em `shopee-callback`, manter o uso estrito do `app_type` vindo do `state`.

### 2. Corrigir o ambiente real que está errado
Como o log ainda mostra `2032348` para Ads, a implementação precisa incluir verificação do ambiente publicado:

- conferir o valor real de `SHOPEE_ADS_PARTNER_ID`
- confirmar que ele está como **2032223**
- redeploy das funções:
  - `shopee-auth`
  - `shopee-callback`
  - `shopee-ads`

Sem isso, mesmo com o código certo no repositório, o botão vai continuar abrindo o fluxo errado.

### 3. Parar de usar “qualquer token Shopee” nas telas de Ads
Hoje algumas telas de Ads ainda usam `useShopeeToken()` sem `appType`, então um token seller pode fazer a UI parecer “conectada”.

**Arquivos**
- `src/components/roas/AdsTab.tsx`
- `src/components/roas/ShopeeIntegrationModal.tsx`
- `src/hooks/useShopeeToken.ts`

**Mudanças**
- Nas telas de Ads, usar apenas:
  - `useShopeeToken('ads')`, ou
  - `useShopeeTokenStatus()`
- O card/header de Ads deve considerar conexão ativa **somente** quando existir token `app_type='ads'`.
- Seller continua separado para Performance / produtos / pedidos.

### 4. Deixar a página de Integrações mais clara
A tela precisa diferenciar duas coisas:
1. **API conectada agora**
2. **histórico de Ads já importado antes**

**Arquivo**
- `src/pages/Integracoes.tsx`

**Mudanças**
- Manter o status de conexão baseado apenas em `shopee_tokens`.
- Adicionar um aviso quando:
  - não há token Ads ativo
  - mas existem linhas em `shopee_ads_by_product`
- Exemplo de mensagem:
  - “Há histórico de Ads salvo, mas a autorização da API Ads não está ativa no momento.”
- Isso resolve a confusão de “estou vendo dados de ads, então por que diz que não está conectada?”.

### 5. Unificar o retorno de erro no lugar certo
Hoje o callback ainda redireciona erros para `/roas` em vários casos.

**Arquivo**
- `supabase/functions/shopee-callback/index.ts`

**Mudanças**
- Todos os erros do callback devem voltar para:
  - `/configuracoes/integracoes`
- Incluir `app_type` e `shopee_error` na URL.
- Assim o erro aparece exatamente na página onde o usuário clicou em conectar.

### 6. Remover fallback perigoso em utilitário auxiliar
Há um fallback antigo no discovery admin que ainda pode mascarar mistura de tokens.

**Arquivo**
- `supabase/functions/shopee-seller-discovery/index.ts`

**Mudança**
- Remover fallback para “qualquer token”.
- Discovery seller deve usar apenas token seller.

### Resultado esperado
- O botão **Conectar Ads** passa a abrir o OAuth do app correto.
- A conta atual deixa de parecer “invertida”.
- A UI passa a mostrar corretamente:
  - Seller conectada ou não
  - Ads conectada ou não
  - histórico salvo de Ads separado da conexão ativa
- Se Ads estiver mal configurada no ambiente, o app mostra erro claro em vez de seguir com Partner ID errado.

### Arquivos que devem entrar nessa correção
```text
supabase/functions/_shared/shopee.ts
supabase/functions/shopee-auth/index.ts
supabase/functions/shopee-callback/index.ts
supabase/functions/shopee-ads/index.ts
supabase/functions/shopee-seller-discovery/index.ts
src/hooks/useShopeeToken.ts
src/pages/Integracoes.tsx
src/components/roas/AdsTab.tsx
src/components/roas/ShopeeIntegrationModal.tsx
```

### Observação técnica
- Não vejo necessidade de migration para resolver este bug.
- As tabelas e políticas atuais já suportam a correção.
- O ponto crítico é: **configuração real da Ads no ambiente + remoção do uso genérico de token nas telas de Ads**.
