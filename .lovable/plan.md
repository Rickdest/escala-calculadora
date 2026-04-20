

## Sem ScraperAPI: usar só Tática B (cookies + UAs rotativos)

Dá sim. A maioria dos projetos open-source faz Google Trends de graça com esse fluxo. Não é 100% confiável, mas com cache de 7 dias e retry inteligente fica usável.

### Por que o nosso código toma 429 hoje

A edge atual chama `/api/explore` direto, sem cookies. O Google detecta na hora e bloqueia. Os projetos que funcionam (pytrends, google-trends-api) fazem **3 etapas** antes:

1. `GET trends.google.com/?geo=BR` → captura cookies `NID` + `CONSENT` da resposta
2. `GET /api/explore` **com esses cookies** + User-Agent de browser real
3. `GET /api/widgetdata/multiline` com token + cookies

Sem cookies = 429 garantido. Com cookies = ~70% de sucesso.

### Plano

**Reescrever `fetch-product-trends`:**

1. **Pool de 5 User-Agents** reais (Chrome/Safari/Firefox desktop) — sortear 1 por chamada
2. **Função `getCookies()`** — bate em `trends.google.com` e extrai `Set-Cookie` (NID, CONSENT, SOCS)
3. **Refatorar `fetchGoogleTrends()`** — passar cookies + UA + headers `Accept-Language: pt-BR` + `Referer: trends.google.com`
4. **Retry com backoff maior** — 3 tentativas com 2s, 5s, 12s (Google libera após pausa)
5. **Cache de 7 dias** — já existe, só garantir que erro não invalida cache anterior
6. **Persistência de cookies** — salvar último cookie válido em `cache_kv` (tabela existente? se não, em memória do isolate) pra não buscar a cada chamada

**Frontend (`ProductTrendTab`):**

- Mensagem de erro melhor quando 429 persistir: "Google Trends está limitando requisições agora. Tente novamente em alguns minutos." + botão Tentar de novo
- Não deixar tela vazia — mostrar skeleton + estado de erro claro
- Se Shopee Keywords vier (mesmo sem Trends), mostrar bloco parcial em vez de nada

**Realista:**
- Sucesso esperado: 60-80% das chamadas
- Quando falhar: usuário vê mensagem clara, pode tentar de novo em 5 min
- Cache 7d evita reabuso quando funciona

### Alternativas que considerei e descartei

- **SerpApi free tier (100/mês)** — descartado, você quer 100% grátis
- **Backend próprio rodando Pytrends** — exigiria infra fora do Lovable
- **Usar dados internos** — você já recusou, quer dados de mercado

### Pergunta

Implemento agora a reescrita com cookies + UAs?

