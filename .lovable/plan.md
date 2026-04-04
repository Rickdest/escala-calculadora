

## Diagnóstico

Três problemas distintos na experiência da aba "Análise de Ads":

1. **Após conectar Ads, nada é importado automaticamente** — O callback (`shopee-callback`) salva o token e redireciona para `/configuracoes/integracoes`. Quando o usuário navega para a aba Ads, não há nenhum trigger de sincronização automática. O botão "Importar Ads" fica escondido no header.

2. **Botão "Importar Ads" é pouco visível** — Aparece como um botão pequeno no canto superior direito, sem destaque. No empty state, aparece como opção secundária abaixo do CSV.

3. **Sem feedback visual durante importação** — O botão gira discretamente mas não há overlay/modal/barra de progresso indicando que algo está acontecendo. Se a edge function demora (30s+), o usuário não sabe o que está ocorrendo.

## Plano

### 1. Auto-sync ao detectar conexão nova sem dados

No `AdsTab`, adicionar um `useEffect` que detecta: API conectada + sem dados persistidos (`!hasPersistedApiData`) + não está sincronizando → dispara `handleImportAds()` automaticamente na primeira vez.
- Usar um `useRef` para evitar múltiplas chamadas
- Isso garante que após conectar, ao abrir Ads, os dados já começam a carregar

### 2. Melhorar visibilidade do empty state

No `AdsEmptyState`, quando `isConnected === true`:
- Inverter a ordem: botão "Importar via API" vira o **primário** (destaque), CSV vira secundário
- Adicionar texto "Sua Shopee Ads está conectada! Importe os dados agora."

### 3. Adicionar overlay de progresso durante importação

Criar um overlay/modal simples no `AdsTab` que aparece quando `syncing === true`:
- Fundo semi-transparente com spinner central
- Texto: "Importando dados de Ads da Shopee..."
- Subtexto: "Isso pode levar até 1 minuto dependendo do número de campanhas."
- Impede que o usuário fique confuso achando que nada está acontecendo

## Arquivos modificados

- `src/components/roas/AdsTab.tsx` — auto-sync + overlay de progresso
- `src/components/roas/AdsEmptyState.tsx` — reorganizar quando conectado

## Sem migration de banco

