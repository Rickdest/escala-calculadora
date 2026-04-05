

## Diagnóstico

Dois problemas no botão "Conectar Shopee Ads":

1. **Chamada sem `async/await`** — `onClick={() => adsHook.startOAuth('ads')}` não captura erros nem gerencia estado de loading. Se falhar, o erro "Unauthorized" aparece mas o botão não reseta.

2. **Estado `connecting` compartilhado** — o estado `connecting` só é setado pelo botão Seller. O botão Ads usa o mesmo `disabled={connecting}` mas nunca seta `connecting`, então se der erro no Seller, o Ads fica travado.

## Plano

### 1. Criar handler dedicado para Ads
Adicionar `handleConnectAds` similar ao `handleConnectSeller`, com seu próprio try/catch e gerenciamento do estado `connecting`:

```typescript
const handleConnectAds = async () => {
  setConnecting(true);
  try {
    await adsHook.startOAuth('ads');
  } catch {
    setConnecting(false);
  }
};
```

### 2. Atualizar o botão Ads para usar o novo handler
Trocar `onClick={() => adsHook.startOAuth('ads')}` por `onClick={handleConnectAds}`.

## Arquivo modificado
- `src/pages/Integracoes.tsx` — adicionar `handleConnectAds` e atualizar o onClick do botão Ads

