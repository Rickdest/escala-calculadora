
Resumo
- Não, o erro atual não acontece porque o sistema pede 2 conexões ao mesmo tempo.
- Hoje o clique falha já na 1ª autorização, a de Seller.
- Os logs mostram que o backend está gerando a URL errada:
  - Seller saindo com `partner_id=2032223` (ID de Ads)
  - redirect saindo para `https://app.richardaragao.com.br/shopee-callback`
- Como a Shopee foi configurada para `https://app.skalify.com.br`, ela rejeita o fluxo antes da segunda etapa.

Plano
1. Corrigir a configuração real do OAuth
   - Ajustar os secrets de runtime para:
     - `SHOPEE_PARTNER_ID = 2032348`
     - `SHOPEE_ADS_PARTNER_ID = 2032223`
     - `APP_URL = https://app.skalify.com.br`
   - Revalidar nos logs que:
     - seller usa `2032348`
     - ads usa `2032223`
     - redirect usa `https://app.skalify.com.br/shopee-callback`

2. Remover referências antigas de domínio no frontend
   - `index.html`: trocar o canonical antigo `app.richardaragao.com.br` pelo domínio atual.
   - Revisar referências fixas ao domínio antigo para não manter a confusão.

3. Tornar o fluxo “1 clique” robusto
   - `src/pages/Integracoes.tsx`
   - `src/pages/ShopeeCallback.tsx`
   - `supabase/functions/shopee-callback/index.ts`
   - Manter 2 autorizações (Seller e Ads), mas em sequência.
   - Parar de depender só de `localStorage` para iniciar Ads depois do Seller.
   - Passar um marcador no callback/redirect (`next=ads` ou similar), para o segundo OAuth continuar mesmo quando o usuário inicia pelo preview e volta no domínio oficial.

4. Melhorar feedback da tela
   - `src/pages/Integracoes.tsx`
   - Desabilitar o botão enquanto a URL de OAuth está sendo gerada.
   - Mostrar erro específico para domínio/Partner ID incorreto.
   - Se Seller falhar, não tentar Ads.

5. Verificação final
   - Conta sem integração: clicar em “Conectar com Shopee” deve abrir primeiro o Seller correto.
   - Após aprovar Seller, Ads deve abrir automaticamente.
   - Ao voltar, a página deve mostrar Seller e Ads separados, sem estado invertido.

Detalhes técnicos
- O header/auth não é o problema: a chamada para `shopee-auth` já responde 200.
- O problema está na URL gerada pelo backend.
- O fluxo atual não abre as 2 conexões ao mesmo tempo; ele tenta apenas Seller primeiro.
- O segundo problema é de origem/domínio: o encadeamento de Ads hoje usa `localStorage`, que não é confiável quando o clique começa no preview e o callback volta no domínio oficial.

Arquivos envolvidos
- `index.html`
- `src/pages/Integracoes.tsx`
- `src/pages/ShopeeCallback.tsx`
- `supabase/functions/shopee-auth/index.ts`
- `supabase/functions/shopee-callback/index.ts`

Sem migration de banco.
