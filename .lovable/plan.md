

## Plano: Corrigir erro de domínio no OAuth de Ads

### Diagnóstico

O erro `"The domain of redirect is not consistent with the Redirect URL Domain declared in console"` vem da **Shopee**, não do nosso código. Significa que o domínio de redirecionamento usado pelo app **Skalify Ads** (Partner ID 2032223) não está registrado no Shopee Partner Console.

### Por que precisa de 2 conexões?

Sim, são necessárias **duas autorizações separadas** porque são dois apps diferentes na Shopee:
- **Skalify App** (2032348) — acesso a produtos, pedidos, estoque
- **Skalify Ads** (2032223) — acesso a campanhas, ROAS, gastos

Cada app tem suas próprias credenciais e requer autorização OAuth independente. Não é possível puxar dados de Ads com o token do Seller (e vice-versa). O fluxo em cadeia que já implementamos (seller → ads automaticamente) torna isso transparente para o usuário.

### Correção necessária

**Ação manual no Shopee Partner Console** (não é código):

1. Acessar o [Shopee Partner Console](https://partner.shopeemobile.com) com a conta do app **Skalify Ads** (Partner ID 2032223)
2. Ir em **App Settings → Redirect URL**
3. Adicionar o domínio `app.richardaragao.com.br` (o mesmo registrado no app Seller)
4. Salvar

Após isso, o botão "Conectar" no card de Ads vai funcionar normalmente.

### Melhoria no código (opcional)

Tratar o erro de domínio no frontend para mostrar uma mensagem amigável em vez do JSON cru:

**Arquivo: `src/pages/Integracoes.tsx`**
- No `useEffect` que lê `searchParams`, verificar se `shopee_error=error_param` e mostrar toast com mensagem clara: "Erro de configuração na Shopee. Entre em contato com o suporte."

### Resultado
- Após registrar o domínio no Partner Console da Shopee Ads, ambas as conexões funcionam
- O fluxo em cadeia (seller → ads) continua funcionando como implementado
- Erro tratado no frontend com mensagem amigável

