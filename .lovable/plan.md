

## Fix: App não abre como aplicativo + ícone não aparece na tela de início

### Problema
Falta o arquivo `manifest.json` e as tags `<link>` para `apple-touch-icon` no `index.html`. Sem o manifest com `"display": "standalone"`, o navegador trata como site normal. Sem `apple-touch-icon`, o iOS usa um screenshot como ícone.

### Correção

**1. Criar `public/manifest.json`**
```json
{
  "name": "Skalify",
  "short_name": "Skalify",
  "description": "Precificação inteligente e gestão de Ads orientada por dados",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0D1117",
  "theme_color": "#F97316",
  "icons": [
    { "src": "/favicon.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/favicon.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**2. Atualizar `index.html` — adicionar no `<head>`**
- `<link rel="manifest" href="/manifest.json">`
- `<link rel="apple-touch-icon" href="/favicon.png">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<link rel="icon" href="/favicon.png" type="image/png">`

**3. Remover `public/favicon.ico`** — browsers solicitam `/favicon.ico` por padrão e ele pode sobrescrever o `.png`.

### Nota importante
- Não será adicionado service worker nem `vite-plugin-pwa` — apenas o manifest simples é suficiente para instalabilidade
- O ícone usará o `favicon.png` já existente no projeto. Se quiser um ícone diferente/maior, envie a imagem desejada

### Resultado
Ao adicionar à tela de início, o app abrirá em tela cheia (sem barra do navegador) e mostrará o ícone correto.

