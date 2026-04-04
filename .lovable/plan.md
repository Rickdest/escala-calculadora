

## Problemas identificados

1. **Redirecionamento automático para Ads é confuso** — Depois de conectar o Seller, o sistema redireciona automaticamente para o OAuth de Ads sem explicar. O usuário vê outra tela de login sem entender por quê.

2. **Ao desconectar Seller com Ads ainda conectada, não aparece botão para reconectar Seller** — O card do Seller desaparece completamente (condição na linha 281: `sellerConnected`), e como `neitherConnected` é false (Ads ainda está conectada), o card unificado de conexão também não aparece.

3. **Tela de Ads não mostra permissões** — Isso é do lado da Shopee (imagem 144 vs 145), não controlamos. Mas podemos informar melhor o usuário.

## Plano

### 1. Remover auto-redirect para Ads — substituir por banner explicativo

- Remover o `useEffect` (linhas 99-113) que auto-inicia `adsHook.startOAuth('ads')` após o callback do Seller
- Remover o `localStorage` de `skalify_pending_ads_oauth`
- Após conectar Seller com sucesso, mostrar um banner destacado no card de Ads dizendo: "Seller conectado! Agora conecte os dados de Ads para ver ROAS e campanhas." com botão "Conectar Ads"
- Isso dá ao usuário controle e contexto sobre o que está acontecendo

### 2. Mostrar card de Seller desconectada quando apenas Ads está conectada

- Alterar a lógica de renderização: o card do Seller deve aparecer também quando `!sellerConnected && adsConnected`, mostrando status "Não conectada" com botão "Conectar"
- Isso resolve o problema de não poder reconectar Seller sem remover tudo

### 3. Melhorar feedback na transição Seller → Ads

- No card de Ads (quando não conectada), adicionar texto explicativo: "Esta é uma segunda autorização necessária para acessar dados de campanhas e anúncios. Você será redirecionado para a Shopee novamente."

## Arquivos modificados

- `src/pages/Integracoes.tsx` — único arquivo alterado

## Sem migrations de banco

