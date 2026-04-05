

## Diagnóstico

O botão "Desconectar" apenas deleta o token da tabela `shopee_tokens` no banco. Ele **não limpa os dados de performance** nem invalida nada na API da Shopee. O erro `shop_no_linked` vem do lado da Shopee (o parceiro não está mais vinculado à loja), então desconectar localmente não resolve — é preciso refazer o OAuth.

O problema real: quando o token mostra "0 dias restantes" e `needs_reauth: true`, o sistema deveria **automaticamente** orientar o usuário a reconectar, sem precisar desconectar manualmente primeiro.

## Plano de melhoria

### 1. Ao desconectar, limpar dados de performance (opcional)
Após deletar o token, **não** apagar `shopee_performance` — manter o histórico. Apenas mostrar que a loja não está mais conectada.

### 2. Fluxo automático de reconexão quando token expira
Quando `needs_reauth: true` é detectado (via sync ou ao carregar a página de integrações):
- Trocar o badge de "Conectada" para **"Expirado"** (vermelho)
- Esconder o botão "Reconectar" genérico e mostrar um botão destacado **"Reconectar agora"** com ícone de alerta
- Desabilitar o toggle de sincronização automática

### 3. Ao clicar "Reconectar", fazer OAuth direto
O botão "Reconectar" já chama `startOAuth('seller')`. O fluxo correto é:
1. Usuário clica "Reconectar"
2. OAuth redireciona para Shopee
3. Shopee autoriza → callback salva novo token
4. Dados de performance são preservados e o próximo sync atualiza

### 4. Toast informativo ao abrir a página com token expirado
Se ao carregar a página de integrações o token existe mas está com `needs_reauth`, mostrar toast: "Sua autorização Shopee expirou. Clique em Reconectar para renovar."

## Arquivos modificados
- `src/pages/Integracoes.tsx` — lógica de exibição do estado expirado + toast automático
- `src/hooks/useShopeeToken.ts` — expor flag `needs_reauth` de forma reativa

## Sem migration

